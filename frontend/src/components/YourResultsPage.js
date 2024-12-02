import React, { useState, useEffect } from "react";
import { FaShareAlt } from "react-icons/fa";
import { FaTint, FaSmile, FaDotCircle, FaMedkit, FaHeart } from "react-icons/fa";
import "./YourResultsPage.css";

const YourResultsPage = () => {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedResults = localStorage.getItem("analysisResults");
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        setResults(parsedResults);
      } catch (error) {
        console.error("Error parsing results from localStorage:", error);
        setError("Failed to load your results.");
      }
    } else {
      setError("No results found. Please upload your images again.");
    }
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!results) {
    return <p className="loading-message">Loading...</p>;
  }

  const scores = results;

  const renderStat = (label, score = 0) => (
    <div className="stat-item" key={label}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{score}</div>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={{ width: `${score}%` }}></div>
      </div>
    </div>
  );

  const renderExplanation = (label, explanation) => {
    const icons = {
      Redness: <FaTint className="explanation-icon" />,
      Hydration: <FaSmile className="explanation-icon" />,
      Pores: <FaDotCircle className="explanation-icon" />,
      Acne: <FaMedkit className="explanation-icon" />,
      "Overall Skin Quality": <FaHeart className="explanation-icon" />,
    };

    return (
      <div className="explanation-item" key={label}>
        {icons[label]}
        <div className="explanation-text">
          <strong>{label}:</strong> {explanation}
        </div>
      </div>
    );
  };

  const handleShare = () => {
    const shareData = {
      title: "My Skin Analysis Results",
      text: "Check out my skin analysis results!",
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch((err) => console.error("Error sharing:", err));
    } else {
      alert("Sharing is not supported in your browser.");
    }
  };

  return (
    <div className="results-page">
      <h1>Your Results</h1>
      <div className="stats-card">
        <div className="stats-details">
          {renderStat("Overall Skin Quality", scores["Overall Skin Quality"]?.score)}
          {renderStat("Redness", scores.Redness?.score)}
          {renderStat("Hydration", scores.Hydration?.score)}
          {renderStat("Pores", scores.Pores?.score)}
          {renderStat("Acne", scores.Acne?.score)}
        </div>
        <button className="share-button" onClick={handleShare}>
          <FaShareAlt /> Share Results
        </button>
      </div>
      <div className="explanations-box">
        {Object.entries(scores).map(([label, { explanation }]) =>
          renderExplanation(label, explanation)
        )}
      </div>
    </div>
  );
};

export default YourResultsPage;
