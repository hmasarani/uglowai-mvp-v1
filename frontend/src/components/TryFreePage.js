import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TryFreePage.css";

const TryFreePage = () => {
  const [images, setImages] = useState([null, null, null]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (index, event) => {
    const newImages = [...images];
    const file = event.target.files[0];

    console.log(`Image selected for index ${index}:`, file);

    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        console.log("Error: Only image files are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {  // Limiting file size to 5MB
        setError("File size should be less than 5MB.");
        console.log("Error: File size exceeds limit (5MB).");
        return;
      }
      newImages[index] = file;
      setImages(newImages);
      setError(""); // Clear error on valid file selection
    }
  };

  const handleTakePhoto = (index) => {
    const inputElement = document.getElementById(`file-input-${index}`);
    if (inputElement) {
      inputElement.click();
      console.log(`Input element for index ${index} clicked.`);
    } else {
      console.error(`Input element with id file-input-${index} not found.`);
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages[index] = null;
    setImages(newImages);
    setError(""); // Clear error when image is removed
    console.log(`Image at index ${index} removed.`);
  };

  const handleSubmit = async () => {
    const filledImages = images.filter((img) => img !== null);

    console.log(`Images ready for submission: ${filledImages.length} image(s)`);

    if (filledImages.length !== 3) {
      setError(`Please upload exactly 3 pictures. You have ${filledImages.length} image(s) uploaded.`);
      console.log(`Error: Not exactly 3 images uploaded. Current: ${filledImages.length}`);
      return;
    }

    const formData = new FormData();
    filledImages.forEach((image, index) => {
      formData.append("files", image, `image${index + 1}.jpg`);
      console.log(`Image ${index + 1} added to FormData.`);
    });

    setIsSubmitting(true); // Indicate submission is in progress
    setError(""); // Clear any previous error

    try {
      console.log("Submitting images to the server...");
      const response = await fetch("https://uglowai-mvp-v1.vercel.app/analyze-images", {
        method: "POST",
        body: formData,
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Server Error: ${response.statusText}\n${errorData}`);
      }

      const result = await response.json();
      console.log("Server Response:", result);

      if (result && result.scores) {
        localStorage.setItem("analysisResults", JSON.stringify(result.scores));
        navigate("/your-results");
        console.log("Navigation to results page.");
      } else {
        setError("Server returned no results. Please try again.");
        console.log("Error: Server returned no results.");
      }
    } catch (error) {
      console.error("Error analyzing images:", error);
      setError("Failed to analyze images. Please ensure all images are valid and try again.");
    } finally {
      setIsSubmitting(false); // Reset submission state
      console.log("Image submission finished.");
    }
  };

  return (
    <div className="try-free-page">
      <h1>Upload Your Images</h1>
      <p>Upload exactly 3 pictures of your face for analysis.</p>
      <div className="upload-section">
        {images.map((image, index) => (
          <div className="upload-item" key={index}>
            {image ? (
              <div className="image-preview">
                <img src={URL.createObjectURL(image)} alt={`Uploaded ${index + 1}`} />
                <button 
                  className="remove-button" 
                  onClick={() => handleRemoveImage(index)} 
                  aria-label={`Remove image ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="upload-controls">
                <input
                  id={`file-input-${index}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageChange(index, e)}
                  aria-label={`Choose image ${index + 1}`}
                />
                <button 
                  onClick={() => handleTakePhoto(index)} 
                  aria-label={`Capture image ${index + 1}`}
                >
                  Choose Image
                </button>
                <p className="placeholder">No file selected</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {error && <p className="error-message" aria-live="assertive">{error}</p>}
      <button 
        onClick={handleSubmit} 
        disabled={isSubmitting} 
        className={isSubmitting ? "submit-button disabled" : "submit-button"}
        aria-label="Submit images for analysis"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
};

export default TryFreePage;
