import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const TryFreePage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate number of files
    if (files.length !== 3) {
      setUploadError("Please select exactly 3 images");
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setUploadError("Only JPEG, PNG, and HEIC files are allowed");
      return;
    }

    setSelectedFiles(files);
    setUploadError("");
  };

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();

    // Validate file selection
    if (selectedFiles.length !== 3) {
      setUploadError("Please select exactly 3 images");
      return;
    }

    // Create FormData
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      setIsUploading(true);
      setUploadError("");

      // Send files to backend
      const response = await axios.post(
        'https://your-backend-url.com/analyze-images', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Handle successful upload
      console.log('Upload successful', response.data);
      // Navigate to results page or handle response as needed
      // navigate('/results');

    } catch (error) {
      console.error('Upload failed', error);
      setUploadError(error.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="try-free-page">
      <h1>Upload Your Skin Images</h1>
      <p>Please upload 3 clear, well-lit images of your face</p>

      <form onSubmit={handleUpload}>
        <input 
          type="file" 
          multiple 
          accept="image/jpeg,image/png,image/heic,image/heif"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <h3>Selected Files:</h3>
            {selectedFiles.map((file, index) => (
              <p key={index}>{file.name}</p>
            ))}
          </div>
        )}

        {uploadError && (
          <p className="error-message">{uploadError}</p>
        )}

        <button 
          type="submit" 
          disabled={selectedFiles.length !== 3 || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Analyze My Skin'}
        </button>
      </form>
    </div>
  );
};

export default TryFreePage;