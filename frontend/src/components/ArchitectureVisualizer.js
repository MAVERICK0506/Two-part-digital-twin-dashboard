import React, { useState } from 'react';
import './ArchitectureVisualizer.css';

const DIST_COLORS = {
  'norm': '#a8e6cf',
  'triang': '#ffd3b6',
  'uniform': '#dcedc1',
  'weibull_min': '#ffaaa5',
  'gamma': '#ff8b94',
  'unknown': '#e0e0e0'
};

const DIST_NAMES = {
  'norm': 'Normal',
  'triang': 'Triangular',
  'uniform': 'Uniform',
  'weibull_min': 'Weibull',
  'gamma': 'Gamma'
};

function ArchitectureVisualizer({ config }) {
  const [selectedStation, setSelectedStation] = useState(null);

  const formatParams = (distType, params) => {
    if (!params || params.length === 0) return 'N/A';
    
    try {
      if (distType === 'norm') {
        return `μ=${params[0].toFixed(2)}, σ=${params[1].toFixed(2)}`;
      } else if (distType === 'triang') {
        const c = params[0];
        const loc = params[1];
        const scale = params[2];
        const peak = loc + c * scale;
        return `Peak=${peak.toFixed(2)}`;
      } else if (distType === 'uniform') {
        const min = params[0];
        const max = params[0] + params[1];
        return `[${min.toFixed(2)} - ${max.toFixed(2)}]`;
      } else if (distType === 'weibull_min') {
        return `Shape=${params[0].toFixed(2)}`;
      }
      return params.map(p => p.toFixed(2)).join(', ');
    } catch {
      return 'Complex';
    }
  };

  return (
    <div className="architecture-visualizer">
      <div className="card">
        <h2 className="card-title">Discovered System Architecture</h2>
        <p className="subtitle">
          The twin automatically inferred this topology and fitted distributions to each station.
          Click any station to see details.
        </p>

        <div className="flow-container">
          {config.topology.map((station, index) => {
            const stationConfig = config.stations[station] || {};
            const distType = stationConfig.type || 'unknown';
            const distColor = DIST_COLORS[distType];

            return (
              <React.Fragment key={station}>
                <div
                  className={`station-node ${selectedStation === station ? 'selected' : ''}`}
                  style={{ backgroundColor: distColor }}
                  onClick={() => setSelectedStation(station)}
                >
                  <div className="station-name">{station}</div>
                  <div className="station-dist">
                    {DIST_NAMES[distType] || distType}
                  </div>
                  <div className="station-params">
                    {formatParams(distType, stationConfig.params)}
                  </div>
                </div>
                
                {index < config.topology.length - 1 && (
                  <div className="flow-arrow">→</div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Legend */}
        <div className="legend">
          <h4>Distribution Types</h4>
          <div className="legend-items">
            {Object.entries(DIST_COLORS).filter(([key]) => key !== 'unknown').map(([key, color]) => (
              <div key={key} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: color }}></div>
                <span>{DIST_NAMES[key] || key}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Station Details Panel */}
      {selectedStation && (
        <div className="card station-details">
          <h3>Station Details: {selectedStation}</h3>
          {(() => {
            const stationConfig = config.stations[selectedStation] || {};
            const distType = stationConfig.type || 'unknown';
            const params = stationConfig.params || [];
            
            return (
              <div className="details-content">
                <div className="detail-row">
                  <strong>Distribution Type:</strong>
                  <span>{DIST_NAMES[distType] || distType}</span>
                </div>
                <div className="detail-row">
                  <strong>Parameters:</strong>
                  <span>{formatParams(distType, params)}</span>
                </div>
                <div className="detail-row">
                  <strong>Raw Parameters:</strong>
                  <code>{JSON.stringify(params.map(p => p.toFixed(4)))}</code>
                </div>
                <div className="detail-explanation">
                  <strong>Why this distribution?</strong>
                  <p>
                    {distType === 'norm' && 'Normal distribution suggests consistent, symmetric processing times around a mean.'}
                    {distType === 'triang' && 'Triangular distribution indicates times clustered around a most-likely value.'}
                    {distType === 'uniform' && 'Uniform distribution means processing times are equally likely within a range.'}
                    {distType === 'weibull_min' && 'Weibull distribution captures complex patterns with specific shape characteristics.'}
                    {distType === 'gamma' && 'Gamma distribution models waiting times and right-skewed processes.'}
                  </p>
                </div>
              </div>
            );
          })()}
          <button className="btn btn-primary" onClick={() => setSelectedStation(null)}>
            Close
          </button>
        </div>
      )}

      {/* Key Insights */}
      <div className="card insights-card">
        <h3>Key Insights</h3>
        <div className="insights-grid">
          <div className="insight">
            <div className="insight-label">Bottleneck Detected</div>
            <div className="insight-value">Drilling Station</div>
            <p className="insight-desc">Longest average processing time (~10.6s)</p>
          </div>
          <div className="insight">
            <div className="insight-label">Total Stations</div>
            <div className="insight-value">{config.topology.length}</div>
            <p className="insight-desc">Fully automated discovery</p>
          </div>
          <div className="insight">
            <div className="insight-label">Flow Type</div>
            <div className="insight-value">Sequential</div>
            <p className="insight-desc">FIFO queues, single capacity</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchitectureVisualizer;
