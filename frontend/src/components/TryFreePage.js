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

    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
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
    } else {
      console.error(`Input element with id file-input-${index} not found.`);
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages[index] = null;
    setImages(newImages);
    setError(""); // Clear error when image is removed
  };

  const handleSubmit = async () => {
    const filledImages = images.filter((img) => img !== null);

    if (filledImages.length !== 3) {
      setError(`Please upload exactly 3 pictures. You have ${filledImages.length} image(s) uploaded.`);
      return;
    }

    const formData = new FormData();
    filledImages.forEach((image, index) => {
      formData.append("files", image, `image${index + 1}.jpg`);
    });

    setIsSubmitting(true); // Indicate submission is in progress
    setError(""); // Clear any previous error

    try {
      const response = await fetch("https://uglowai-mvp-v1.vercel.app/analyze-images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Server Error: ${response.statusText}\n${errorData}`);
      }

      const result = await response.json();

      if (result && result.scores) {
        localStorage.setItem("analysisResults", JSON.stringify(result.scores));
        navigate("/your-results");
      } else {
        setError("Server returned no results. Please try again.");
      }
    } catch (error) {
      console.error("Error analyzing images:", error);
      setError("Failed to analyze images. Please ensure all images are valid and try again.");
    } finally {
      setIsSubmitting(false); // Reset submission state
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
      {error && <p className="error-message">{error}</p>}
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
