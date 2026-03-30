import React, { useState } from 'react';
import { CheckCircle, Activity } from 'lucide-react';
import './App.css';
import ArchitectureVisualizer from './components/ArchitectureVisualizer';
import ValidationChart from './components/ValidationChart';
import StorySection from './components/StorySection';
import SimulationRunner from './components/SimulationRunner';
import FileUpload from './components/FileUpload';
import EmptyState from './components/EmptyState';
import PlantBuilder from './components/PlantBuilder';

const API_URL = 'http://localhost:8000';

function App() {
  const [config, setConfig] = useState(null);
  const [loading] = useState(false);
  const [activePart, setActivePart] = useState('partA');
  const [partBTab, setPartBTab] = useState('overview');
  const [systemDiscovered, setSystemDiscovered] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [validationAccuracy, setValidationAccuracy] = useState(null);
  const [generatedCsvReady, setGeneratedCsvReady] = useState(false);

  const handleUploadSuccess = (newConfig) => {
    setConfig(newConfig);
    setSystemDiscovered(true);
    setSimulationResults(null);
    setValidationAccuracy(null);
    setPartBTab('architecture');
  };

  const handleSimulationComplete = (results) => {
    setSimulationResults(results);

    if (results.validation && results.validation.accuracy) {
      setValidationAccuracy(results.validation.accuracy);
    }
  };

  const handleGeneratedCsv = () => {
    setGeneratedCsvReady(true);
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
            <h1>Two-Part Digital Twin Platform</h1>
          </div>
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{validationAccuracy ? `${validationAccuracy.toFixed(2)}%` : '--'}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Synthetic CSV</span>
              <span className="stat-value">{generatedCsvReady ? 'Ready' : 'No'}</span>
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

      <section className="mode-switch">
        <button
          className={activePart === 'partA' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setActivePart('partA')}
        >
          Part A: Build and Run Plant Game
        </button>
        <button
          className={activePart === 'partB' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setActivePart('partB')}
        >
          Part B: Build Self-Learning Twin
        </button>
      </section>

      <section className="system-note">
        <p>
          Part B is independent: upload any valid CSV (from Part A or any external source) with the required schema.
        </p>
      </section>

      {activePart === 'partB' && (
        <nav className="nav-tabs">
          <button
            className={partBTab === 'overview' ? 'tab active' : 'tab'}
            onClick={() => setPartBTab('overview')}
          >
            Overview
          </button>
          <button
            className={partBTab === 'upload' ? 'tab active' : 'tab'}
            onClick={() => setPartBTab('upload')}
          >
            Upload Data
          </button>
          <button
            className={partBTab === 'architecture' ? 'tab active' : 'tab'}
            onClick={() => setPartBTab('architecture')}
          >
            System Architecture
          </button>
          <button
            className={partBTab === 'simulation' ? 'tab active' : 'tab'}
            onClick={() => setPartBTab('simulation')}
          >
            Live Simulation
          </button>
          <button
            className={partBTab === 'validation' ? 'tab active' : 'tab'}
            onClick={() => setPartBTab('validation')}
          >
            Validation Proof
          </button>
        </nav>
      )}

      <main className="main-content">
        {activePart === 'partA' && (
          <>
            <div className="card">
              <h2 className="card-title">Part A: Plant Simulation Game</h2>
              <p>
                Build your plant manually, run simulation, and download event-log CSV. Then manually switch to Part B to upload it.
              </p>
            </div>
            <PlantBuilder
              apiUrl={API_URL}
              onUseGeneratedCsv={handleGeneratedCsv}
            />
            <div className="card handoff-card">
              <h3>Manual Handoff</h3>
              <p>
                After downloading CSV in Part A, open Part B and upload that file manually. This proves Part B also works with external CSV files.
              </p>
              <button className="btn btn-primary" onClick={() => setActivePart('partB')}>
                Go to Part B
              </button>
            </div>
          </>
        )}

        {activePart === 'partB' && (
          <>
            {partBTab === 'overview' && <StorySection />}
            {partBTab === 'upload' && <FileUpload apiUrl={API_URL} onUploadSuccess={handleUploadSuccess} />}
            {partBTab === 'architecture' && (
              systemDiscovered && config ? (
                <ArchitectureVisualizer config={config} />
              ) : (
                <EmptyState
                  title="No System Discovered Yet"
                  message="Upload a compatible CSV from any source to discover architecture."
                  actionText="Go to Upload"
                  onAction={() => setPartBTab('upload')}
                />
              )
            )}
            {partBTab === 'simulation' && (
              systemDiscovered ? (
                <SimulationRunner apiUrl={API_URL} onSimulationComplete={handleSimulationComplete} />
              ) : (
                <EmptyState
                  title="No System Available"
                  message="Upload a compatible CSV first, then run twin simulation and validation."
                  actionText="Go to Upload"
                  onAction={() => setPartBTab('upload')}
                />
              )
            )}
            {partBTab === 'validation' && (
              <ValidationChart simulationData={simulationResults} />
            )}
          </>
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
