import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import dotenv from "dotenv";
import OpenAI from "openai";
import uploadFileToS3 from "./S3Uploader.js";


// Load environment variables
try {
  dotenv.config();
} catch (error) {
  console.error("Error loading .env file:", error);
}



app.use("/", (req, res) => {
    res.send("Server is running!");
});

// Validate critical environment variables
const requiredEnvVars = [
 'OPENAI_API_KEY',
 'AWS_ACCESS_KEY_ID',
 'AWS_SECRET_ACCESS_KEY',
 'AWS_REGION',
 'AWS_BUCKET_NAME'
];


requiredEnvVars.forEach(varName => {
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
app.use(cors({
  origin: [""],
  methods: ["POST", "GET"],
  credentials: true
}));
app.use(bodyParser.json());


// Multer configuration with enhanced file validation
const upload = multer({
 storage: multer.memoryStorage(),
 limits: {
   fileSize: 5 * 1024 * 1024, // 5MB file size limit
 },
 fileFilter: (req, file, cb) => {
   const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
   if (allowedTypes.includes(file.mimetype)) {
     cb(null, true);
   } else {
     cb(new Error('Invalid file type. Only JPEG, PNG and GIF images are allowed.'));
   }
 }
});


// Endpoint for analyzing images
app.post("/analyze-images", upload.array("files", 3), async (req, res) => {
 try {
   // Log uploaded files
   console.log('Uploaded Files:', req.files.map(file => ({
     originalname: file.originalname,
     mimetype: file.mimetype,
     size: file.size,
     bufferLength: file.buffer.length
   })));


   // Validate 3 images are uploaded
   if (!req.files || req.files.length !== 3) {
     return res.status(400).json({
       message: "Missing picture(s). Please upload 3 pictures to proceed.",
     });
   }


   // Upload images to S3
   const uploadedFiles = await Promise.all(
     req.files.map(async (file, index) => {
       const fileBuffer = file.buffer;
       const fileName = `images/face-${Date.now()}-${index + 1}.jpg`;
       console.log(`Uploading file ${index + 1}:`, {
         fileName,
         bufferLength: fileBuffer.length
       });
       return uploadFileToS3(fileBuffer, fileName);
     })
   );


   // Prepare image metadata for analysis
   const imageDescriptions = uploadedFiles.map((file, index) => ({
     id: index + 1,
     url: file.Location,
   }));


   // Skin analysis prompt
  // Detailed prompt with explicit JSON instructions
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
`;


   console.log('Image URLs for OpenAI:', imageDescriptions.map(img => img.url));


   // Make the OpenAI API call
   const openaiResponse = await openai.chat.completions.create({
     model: "gpt-4-turbo",
     messages: [
       {
         role: "user",
         content: skinAnalysisPrompt
       }
     ],
     temperature: 0.4,
     max_tokens: 4000,
     top_p: 1,
     frequency_penalty: 0,
     presence_penalty: 0,
   });


   // Extract response content
   const responseContent = openaiResponse.choices[0].message.content;
   console.log('Response Content:', responseContent);


   // Attempt to parse JSON directly
   let scores;
   try {
     scores = JSON.parse(responseContent);
   } catch (parseError) {
     console.error('JSON Parsing Error:', parseError);
     return res.status(500).json({
       message: "Failed to parse analysis results",
       error: parseError.message,
       rawResponse: responseContent
     });
   }


   // Validate JSON structure
   if (!scores.Redness || !scores.Hydration || !scores.Pores || !scores.Acne || !scores["Overall Skin Quality"]) {
     return res.status(500).json({
       message: "Incomplete analysis results",
       rawResponse: responseContent
     });
   }


   // Send successful response
   res.status(200).json({
     message: "Images analyzed successfully",
     images: imageDescriptions,
     scores: scores,
   });


 } catch (error) {
   // Comprehensive error logging
   console.error("Detailed Error:", {
     message: error.message,
     name: error.name,
     stack: error.stack,
     response: error.response ? JSON.stringify(error.response) : 'No response object'
   });


   res.status(500).json({
     message: "An unexpected error occurred while processing images",
     error: process.env.NODE_ENV !== 'production' ? error.message : 'Internal Server Error'
   });
 }
});


// Health check endpoint
app.get('/health', (req, res) => {
 res.status(200).json({
   status: 'healthy',
   timestamp: new Date().toISOString()
 });
});


// 404 handler
app.use((req, res, next) => {
 res.status(404).json({
   message: 'Route not found',
   path: req.path
 });
});


app.get('/debug-env', (req, res) => {
 res.json({
   openaiApiKey: process.env.OPENAI_API_KEY ? "Exists" : "Missing",
 });
});


// Global error handler
app.use((err, req, res, next) => {
 console.error(err.stack);
 res.status(500).json({
   message: 'An unexpected error occurred',
   error: process.env.NODE_ENV === 'production' ? {} : err.message
 });
});

// Start the server
const server = app.listen(port, () => {
 console.log(`Server running at http://localhost:${port}`);
});


// Graceful shutdown      
process.on('SIGTERM', () => {
 console.log('SIGTERM signal received: closing HTTP server');
 server.close(() => {
   console.log('HTTP server closed');
   process.exit(0);
 });
});


export default app;



