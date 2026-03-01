import React, { useState } from 'react';
import { Play, Loader, CheckCircle, Activity, AlertCircle } from 'lucide-react';
import axios from 'axios';
import './SimulationRunner.css';

function SimulationRunner({ apiUrl, onSimulationComplete }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async () => {
    setRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post(`${apiUrl}/api/run-simulation`);
      setResults(response.data);
      
      // Notify parent component of simulation completion
      // Pass the ENTIRE response which includes both metrics and validation
      if (onSimulationComplete && response.data.status === 'success') {
        onSimulationComplete(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to run simulation');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="simulation-runner">
      <div className="card">
        <h2 className="card-title">Live Simulation Engine</h2>
        <p className="subtitle">
          Click "Run Simulation" to execute the digital twin in real-time.
          The system will process jobs through all stations and display metrics.
        </p>

        <div className="control-panel">
          <button
            className="btn btn-primary btn-large"
            onClick={runSimulation}
            disabled={running}
          >
            {running ? (
              <>
                <Loader className="spinning" size={24} />
                Running Simulation...
              </>
            ) : (
              <>
                <Play size={24} />
                Run Simulation
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {running && (
          <div className="progress-section">
            <Activity className="pulsing" size={48} />
            <p>Processing jobs through the twin...</p>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        )}

        {results && results.status === 'success' && (
          <div className="results-section">
            <div className="success-banner">
              <CheckCircle size={32} />
              <h3>Simulation Complete!</h3>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Total Jobs Processed</div>
                <div className="metric-value">{results.metrics.total_jobs}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Total Time</div>
                <div className="metric-value">{results.metrics.total_time.toFixed(2)}s</div>
              </div>
            </div>

            <h4 className="section-title">Average Service Times by Station</h4>
            <div className="service-times-grid">
              {Object.entries(results.metrics.avg_service_time).map(([station, time]) => (
                <div key={station} className="service-time-card">
                  <div className="station-label">{station}</div>
                  <div className="time-value">{time.toFixed(2)}s</div>
                  <div className="time-bar">
                    <div
                      className="time-bar-fill"
                      style={{ width: `${(time / 12) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <h4 className="section-title">Average Waiting Times by Station</h4>
            <div className="service-times-grid">
              {Object.entries(results.metrics.avg_waiting_time).map(([station, time]) => (
                <div key={station} className="service-time-card waiting">
                  <div className="station-label">{station}</div>
                  <div className="time-value">{time.toFixed(2)}s</div>
                  <div className="time-bar">
                    <div
                      className="time-bar-fill waiting"
                      style={{ width: `${(time / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card info-card">
        <h3>How It Works</h3>
        <ol className="steps-list">
          <li>
            <strong>Load Configuration:</strong> The twin reads its "DNA" (topology + distributions) from twin_config.json
          </li>
          <li>
            <strong>Initialize Environment:</strong> SimPy creates resources for each station with FIFO queues
          </li>
          <li>
            <strong>Inject Jobs:</strong> Historical arrival times are replayed to match the real factory
          </li>
          <li>
            <strong>Dynamic Sampling:</strong> Service times are generated on-the-fly using scipy distributions
          </li>
          <li>
            <strong>Collect Metrics:</strong> The twin logs processing times, waiting times, and timestamps
          </li>
        </ol>
      </div>
    </div>
  );
}

export default SimulationRunner;
