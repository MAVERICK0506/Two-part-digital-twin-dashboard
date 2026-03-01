import React from 'react';
import { Brain, Zap, Target, TrendingUp } from 'lucide-react';
import './StorySection.css';

function StorySection() {
  return (
    <div className="story-section">
      <div className="card hero-card">
        <h1 className="hero-title">
          Building Digital Twins That Build Themselves
        </h1>
        <p className="hero-subtitle">
          A research-grade system that reverse-engineers manufacturing processes 
          from raw event logs—zero hardcoding required.
        </p>
      </div>

      <div className="grid-3">
        <div className="card feature-card">
          <Brain size={48} className="feature-icon" style={{color: '#667eea'}} />
          <h3>The Problem</h3>
          <p>
            Traditional digital twins require months of manual modeling by experts.
            Each machine, queue, and distribution must be specified by hand.
          </p>
          <p className="highlight">
            What if the twin could learn by just watching?
          </p>
        </div>

        <div className="card feature-card">
          <Zap size={48} className="feature-icon" style={{color: '#f59e0b'}} />
          <h3>Our Innovation</h3>
          <p>
            Drop in production logs → Get a validated twin in minutes.
          </p>
          <ul className="innovation-list">
            <li><strong>Process Mining:</strong> Auto-discovers workflow topology</li>
            <li><strong>Occam's Razor:</strong> Prefers simple distributions unless complex ones are 50% better</li>
            <li><strong>Universal Engine:</strong> Works for any process, any industry</li>
          </ul>
        </div>

        <div className="card feature-card">
          <Target size={48} className="feature-icon" style={{color: '#10b981'}} />
          <h3>The Result</h3>
          <p>
            <strong className="accuracy-badge">99.73% Validation Accuracy</strong>
          </p>
          <p>
            Our twin matches the real factory's behavior with sub-1% error.
            We discovered and fixed 18,000+ zero-second artifacts in the logs.
          </p>
        </div>
      </div>

      <div className="card architecture-card">
        <h2 className="card-title">The 4-Script Architecture</h2>
        <div className="architecture-grid">
          <div className="arch-step">
            <div className="step-number">1</div>
            <h4>Discovery Engine</h4>
            <p className="step-label">"The Brain"</p>
            <p>NetworkX topology inference + KS-test distribution fitting</p>
          </div>
          
          <div className="arch-arrow">→</div>
          
          <div className="arch-step">
            <div className="step-number">2</div>
            <h4>Simulation Engine</h4>
            <p className="step-label">"The Body"</p>
            <p>SimPy discrete-event sim with universal distribution injection</p>
          </div>
          
          <div className="arch-arrow">→</div>
          
          <div className="arch-step">
            <div className="step-number">3</div>
            <h4>Validation Script</h4>
            <p className="step-label">"The Proof"</p>
            <p>Trace-driven comparison with data cleaning</p>
          </div>
          
          <div className="arch-arrow">→</div>
          
          <div className="arch-step">
            <div className="step-number">4</div>
            <h4>Visualization</h4>
            <p className="step-label">"The Map"</p>
            <p>Color-coded topology showing discovered physics</p>
          </div>
        </div>
      </div>

      <div className="card impact-card">
        <TrendingUp size={32} className="impact-icon" />
        <h2 className="card-title">Business Impact</h2>
        <div className="grid-2">
          <div>
            <h4>🏭 Manufacturing Optimization</h4>
            <p>Identify bottlenecks, test capacity changes, predict throughput</p>
          </div>
          <div>
            <h4>⚡ Rapid Deployment</h4>
            <p>Hours instead of months—deploy twins across entire factories</p>
          </div>
          <div>
            <h4>🔬 Research Value</h4>
            <p>Novel fusion of process mining + discrete-event simulation</p>
          </div>
          <div>
            <h4>🌍 Universal Application</h4>
            <p>Automotive, healthcare, logistics—any sequential process</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StorySection;
