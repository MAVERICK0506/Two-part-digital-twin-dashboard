import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import './App.css';
import ArchitectureVisualizer from './components/ArchitectureVisualizer';
import ValidationChart from './components/ValidationChart';
import StorySection from './components/StorySection';
import SimulationRunner from './components/SimulationRunner';
import FileUpload from './components/FileUpload';
import EmptyState from './components/EmptyState';

const API_URL = 'http://localhost:8000';

function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [systemDiscovered, setSystemDiscovered] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [validationAccuracy, setValidationAccuracy] = useState(null); // New: Track accuracy

  const handleUploadSuccess = (newConfig) => {
    // Update config with newly discovered system
    setConfig(newConfig);
    setSystemDiscovered(true);
    // Clear previous simulation results
    setSimulationResults(null);
    setValidationAccuracy(null);
    // Switch to architecture tab to show the discovery
    setActiveTab('architecture');
  };

  const handleSimulationComplete = (results) => {
    // Store simulation results for validation tab
    // Results now include both metrics and validation
    setSimulationResults(results);
    
    // Extract validation accuracy if available
    if (results.validation && results.validation.accuracy) {
      setValidationAccuracy(results.validation.accuracy);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <Activity className="loading-icon" size={48} />
        <p>Loading Digital Twin...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <Activity size={32} className="logo-icon" />
            <h1>Self-Inferencing Digital Twin</h1>
          </div>
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{validationAccuracy ? `${validationAccuracy.toFixed(2)}%` : '--'}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Stations</span>
              <span className="stat-value">{config?.topology?.length || 0}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Zero Hardcoding</span>
              <CheckCircle size={20} color="#10b981" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-tabs">
        <button
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'upload' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('upload')}
        >
          Upload Data
        </button>
        <button
          className={activeTab === 'architecture' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('architecture')}
        >
          System Architecture
        </button>
        <button
          className={activeTab === 'simulation' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('simulation')}
        >
          Live Simulation
        </button>
        <button
          className={activeTab === 'validation' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('validation')}
        >
          Validation Proof
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'overview' && <StorySection />}
        {activeTab === 'upload' && <FileUpload apiUrl={API_URL} onUploadSuccess={handleUploadSuccess} />}
        {activeTab === 'architecture' && (
          systemDiscovered && config ? (
            <ArchitectureVisualizer config={config} />
          ) : (
            <EmptyState 
              title="No System Discovered Yet"
              message="Upload a production log CSV to automatically discover the system architecture."
              actionText="Go to Upload"
              onAction={() => setActiveTab('upload')}
            />
          )
        )}
        {activeTab === 'simulation' && (
          systemDiscovered ? (
            <SimulationRunner apiUrl={API_URL} onSimulationComplete={handleSimulationComplete} />
          ) : (
            <EmptyState 
              title="No System Available"
              message="Please upload a CSV file first to discover the system before running simulation."
              actionText="Go to Upload"
              onAction={() => setActiveTab('upload')}
            />
          )
        )}
        {activeTab === 'validation' && (
          <ValidationChart apiUrl={API_URL} simulationData={simulationResults} />
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Maharashtra Innovation Festival 2026 | Innovative Project Demonstration</p>
      </footer>
    </div>
  );
}

export default App;
