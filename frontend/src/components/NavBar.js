import React from "react";
import "./NavBar.css"; // Styling for the navbar
import logo from "../assets/LogoFinale.png"; // Correct path to logo file
import TryFreeButton from "./TryFreeButton";

const NavBar = () => {
  return (
    <header className="navbar">
      <div className="logo-container">
        <img src={logo} alt="GlowCare Logo" className="logo-image" />
        <h1 className="logo-header">UGlow AI</h1>
      </div>
      <TryFreeButton />
    </header>
  );
};

export default NavBar;
