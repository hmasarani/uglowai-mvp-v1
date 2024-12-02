import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./NavBar";
import { validateEmail } from "../utils/EmailVerification";
import "./LandingPage.css";
import demoVid from "../assets/Prototype_V1.0.0_MicroSaaS.mp4"; 


const LandingPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("https://uglowai-mvp-v1.vercel.app/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setLoading(false);
        navigate("/try-free");
      } else {
        setLoading(false);
        setError(data.message || "An error occurred. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <Navbar />

      <div className="content">
        <div className="text-section">
          <h2 className="funnel-display-landing">
            Phone App Coming Soon - Join Our Waitlist
          </h2>
          <h1 className="funnel-display-landing">
          Unlock Your Skin's Potential with AI-Powered Insights
          </h1>
          <p className="funnel-display-landing">
            Upload your photos and let our AI technology evaluate your skin's hydration, redness, pores, acne, and overall quality - all <b>for free!</b>
          </p>

          <form onSubmit={handleSubmit} className="cta-section">
            <input
              type="email"
              placeholder="Enter your email"
              className="cta-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");  // Clear error when user starts typing
              }}
              required
            />
            <button 
              type="submit" 
              className="cta-button" 
              disabled={loading}
            >
              {loading ? "Submitting..." : "Try Now"}
            </button>
          </form>

          <p className="consent-message">
            By clicking <strong>Try Now</strong>, you agree to receive updates about app launches.
          </p>

          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="image-section">
          <img
            src="/Mockup_02.png"
            alt="App Mockup Showing Skin Analysis"
            className="mockup-image"
            loading="lazy"
          />
        </div>
      </div>

      <div className="video-section">
        <h2 className="video-title">Full Application Coming Soon!</h2>
        <video 
            className="demo-video" 
            loop 
            autoPlay 
            muted 
            playsInline
          >
            <source src={demoVid} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
      </div>
    </div>
  );
};

export default LandingPage;