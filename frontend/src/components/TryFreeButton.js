import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TryFreeButton.css";  // Ensure your CSS is properly imported

const TryFreeButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const navigate = useNavigate();

  // Toggle modal visibility
  const handleButtonClick = () => {
    setIsModalOpen(true);
  };

  // Handle form input change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate email
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailPattern.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    // If valid, redirect to the /try-free page
    localStorage.setItem("userEmail", email);  // Optional: Save email for later use
    setIsModalOpen(false);
    navigate("/try-free");
  };

  return (
    <div>
      <button className="cta-button" onClick={handleButtonClick}>
        Try Now for Free
      </button>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Enter your email</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={handleEmailChange}
              />
              {emailError && <p className="error-message">{emailError}</p>}
              <button type="submit">Submit</button>
            </form>
            <button className="close-button" onClick={() => setIsModalOpen(false)}>
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TryFreeButton;
