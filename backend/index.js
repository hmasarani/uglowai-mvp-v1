import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import dotenv from "dotenv";
import OpenAI from "openai";
import uploadFileToS3 from "./S3Uploader.js";
import sharp from 'sharp';
import convert from 'heic-convert';
import { fileTypeFromBuffer } from 'file-type';

// Load environment variables
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = [
  "OPENAI_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_BUCKET_NAME",
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`Missing critical environment variable: ${varName}`);
    process.exit(1);
  }
});

const app = express();
const port = process.env.PORT || 5001;

// Initialize OpenAI with error handling
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error("Failed to initialize OpenAI:", error);
  process.exit(1);
}

// Middleware
app.use(
  cors({
    origin: ["https://uglowai-mvp-v1-frontend.vercel.app", "http://localhost:3000"],
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Origin"],
    credentials: false,
    maxAge: 86400 // 24 hours
  })
);
app.use(bodyParser.json());

// Root route for basic status
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// CORS health check route
app.get("/test-cors", (req, res) => {
  res.json({ message: "CORS is working!" });
});

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", 
      "image/png", 
      "image/heic", 
      "image/heif", 
      "image/x-citrus"
    ];

    const normalizedMimeType = file.mimetype.toLowerCase();

    if (allowedTypes.includes(normalizedMimeType)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, HEIC`));
    }
  },
});

const convertHeicToJpeg = async (buffer) => {
  try {
    const fileTypeResult = await fileTypeFromBuffer(buffer);

    if (fileTypeResult && fileTypeResult.ext === "heic") {
      const jpegBuffer = await convert({
        buffer,         // the HEIC file buffer
        format: "JPEG", // convert to JPEG
        quality: 0.7,   // adjust quality as needed
      });

      return jpegBuffer;
    }

    // Return the original buffer if it's not a HEIC file
    return buffer;
  } catch (error) {
    console.error("HEIC conversion error:", error);

    // Attempt fallback conversion using sharp
    try {
      return await sharp(buffer)
        .toFormat("jpeg")
        .toBuffer();
    } catch (sharpError) {
      console.error("Sharp conversion error:", sharpError);
      throw new Error("Failed to convert image");
    }
  }
};

// Add a specific CORS handler for the analyze-images endpoint
app.options("/analyze-images", (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://uglowai-mvp-v1-frontend.vercel.app');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Route handler for analyzing images
app.post("/analyze-images", upload.array("files", 3), async (req, res) => {
  // Add CORS headers explicitly
  res.header('Access-Control-Allow-Origin', 'https://uglowai-mvp-v1-frontend.vercel.app');
  
  try {
    console.log("Uploaded Files:", req.files.map(file => ({
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    })));

    // Validate that exactly 3 images were uploaded
    if (!req.files || req.files.length !== 3) {
      return res.status(400).json({
        message: "Please upload exactly 3 pictures to proceed.",
      });
    }

    // Convert all files to JPEG (if needed) and upload them to S3
    const uploadedFiles = await Promise.all(
      req.files.map(async (file, index) => {
        const convertedBuffer = await convertHeicToJpeg(file.buffer);
        const fileName = `images/face-${Date.now()}-${index + 1}.jpg`;

        console.log(`Uploading file ${index + 1} as JPEG:`, fileName);

        // Upload converted image to S3
        return uploadFileToS3(convertedBuffer, fileName);
      })
    );

    // Prepare metadata for OpenAI processing
    const imageDescriptions = uploadedFiles.map((file, index) => ({
      id: index + 1,
      url: file.Location,
    }));

    // Define the OpenAI prompt for skin analysis
    const skinAnalysisPrompt = `
You are a highly advanced skin analysis expert. Your task is to assess the quality of a subject's skin based on an input image. Evaluate the following attributes, providing a score out of 100 for each, where higher scores indicate better skin quality. Include a brief explanation of your assessment. Follow these detailed guidelines:

Attributes for Evaluation:
Redness:
Evaluate the intensity and extent of redness, where less redness corresponds to a higher score.
Scoring Guide:
81-100: No visible redness; skin appears even-toned.
61-80: Mild redness; minor discoloration in isolated areas.
41-60: Moderate redness; noticeable in specific areas (e.g., cheeks, nose).
21-40: Significant redness; visible inflammation or widespread discoloration.
0-20: Severe redness; substantial inflammation or irritation.
Example Explanation: "Mild redness concentrated around the nose and cheeks, scoring 70."

Hydration:
Assess the skin’s moisture level, where well-hydrated skin corresponds to a higher score.
Scoring Guide:
81-100: Fully hydrated; skin is plump, smooth, and radiant.
61-80: Adequately hydrated; minor dryness in isolated areas.
41-60: Mildly dry; visible roughness or lack of elasticity.
21-40: Moderately dry; noticeable dryness and flakiness.
0-20: Severely dry; skin appears cracked or visibly dehydrated.
Example Explanation: "Skin shows slight dryness on the forehead and cheeks, indicating a hydration score of 60."
Pores:
Evaluate the visibility and size of pores, where smaller and less visible pores correspond to a higher score.
Scoring Guide:
81-100: Nearly invisible pores; smooth texture.
61-80: Small, minimally visible pores in specific areas.
41-60: Moderately visible pores, noticeable in the T-zone.
21-40: Large, prominent pores in multiple areas.
0-20: Severe pore visibility; skin texture is coarse.
Example Explanation: "Moderately visible pores on the nose and cheeks, scoring 55."

Acne:
Assess the severity and extent of acne, where clearer skin corresponds to a higher score.
Scoring Guide:
81-100: Clear skin; no visible acne.
61-80: Minimal acne; occasional blackheads or whiteheads.
41-60: Mild acne; some blackheads, whiteheads, or small inflamed spots.
21-40: Moderate acne; a mix of blackheads, whiteheads, or inflamed spots.
0-20: Severe acne; significant inflammation, pustules, or cysts across multiple areas.
Example Explanation: "A few inflamed spots on the chin and forehead, scoring 65 for acne."

Overall Skin Quality:
Provide an overall assessment of skin health by factoring in all the above attributes. Higher scores indicate better skin quality.
Scoring Guide:
81-100: Excellent skin quality; smooth, clear, and well-hydrated.
61-80: Good skin quality; generally healthy with minor issues like mild redness or dryness.
41-60: Fair skin quality; some noticeable issues such as moderate acne or redness.
21-40: Poor skin quality; significant concerns like dryness, redness, or acne.
0-20: Very poor skin quality; multiple severe issues affecting skin health.
Example Explanation: "Overall skin quality is good, with slight redness and mild dryness, scoring 70."

**IMPORTANT**: Output must be valid JSON and contain all five attributes with scores and explanations. Do not include any additional text or commentary.

{
"Redness": {"score": 0, "explanation": "Explanation of redness score."},
"Hydration": {"score": 0, "explanation": "Explanation of hydration score."},
"Pores": {"score": 0, "explanation": "Explanation of pores score."},
"Acne": {"score": 0, "explanation": "Explanation of acne score."},
"Overall Skin Quality": {"score": 0, "explanation": "Explanation of overall skin quality."}
}
`; // Your skin analysis prompt here


    // Process the OpenAI API call
    console.log("Skin Analysis Prompt Sent to OpenAI:", skinAnalysisPrompt);

    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: skinAnalysisPrompt }],
      temperature: 0.4,
      max_tokens: 4000,
    });

    // Log the full OpenAI API response
    console.log("OpenAI API Full Response:", openaiResponse);

    const responseContent = openaiResponse.choices[0]?.message?.content;
    console.log("Extracted Response Content:", responseContent);

    // Parse and validate the JSON response from OpenAI
    let scores;
    try {
      scores = JSON.parse(responseContent);
      console.log("Parsed JSON Scores from OpenAI:", scores);
    } catch (parseError) {
      console.error("Error Parsing OpenAI Response Content as JSON:", responseContent);
      return res.status(500).json({
        message: "Error parsing OpenAI response",
        details: parseError.message,
        rawResponse: responseContent,
      });
    }

    // Log the final response before sending it back to the client
    console.log("Final Response Sent to Client:", {
      imageDescriptions,
      skinAnalysis: scores,
    });

    // Send back the image URLs and analysis scores
    return res.json({ imageDescriptions, skinAnalysis: scores });

  } catch (error) {
    // Log the error details
    console.error("Error processing images or calling OpenAI:", error);

    return res.status(500).json({
      message: "Error processing image files.",
      details: error.message,
    });
  }
});

// Start server (moved outside the try-catch)
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});