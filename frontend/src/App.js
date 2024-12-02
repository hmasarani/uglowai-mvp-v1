import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import your page components
import LandingPage from './components/LandingPage';
import TryFreePage from './components/TryFreePage';
import YourResultsPage from './components/YourResultsPage';
import PageNotFound from './pages/NotFoundPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Define your routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/try-free" element={<TryFreePage />} />
          <Route path="/your-results" element={<YourResultsPage />} />
          
          {/* Fallback route for undefined paths */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
