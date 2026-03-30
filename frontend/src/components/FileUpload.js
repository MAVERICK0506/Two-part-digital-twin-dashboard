import React, { useState } from 'react';
import { Upload, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import './FileUpload.css';

function FileUpload({ apiUrl, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${apiUrl}/api/upload-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 'success') {
        setSuccess(true);
        setError(null);
        
        // Notify parent component to refresh with new config
        if (onUploadSuccess) {
          onUploadSuccess(response.data.config);
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process CSV file');
      setSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <div className="upload-card">
        <div className="upload-hero">
          <h2>🚀 Part B: Upload CSV for Self-Learning Twin</h2>
          <p className="upload-tagline">
            Use CSV from Part A or from any external source with the same format
          </p>
        </div>
        
        <p className="upload-description">
          Upload any CSV file with CaseID, Activity, Timestamp, and Lifecycle columns.
          The system will automatically discover topology, fit distributions, and build the digital twin.
        </p>

        <div className="upload-button-wrapper">
          <input
            type="file"
            id="csv-upload"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          <label htmlFor="csv-upload" className={`btn btn-upload ${uploading ? 'disabled' : ''}`}>
            {uploading ? (
              <>
                <Loader className="spinning" size={20} />
                Processing...
              </>
            ) : (
              <>
                <Upload size={20} />
                Choose CSV File
              </>
            )}
          </label>
        </div>

        {uploading && (
          <div className="processing-message">
            <Loader className="spinning" size={24} />
            <p>Discovering system topology and fitting distributions...</p>
            <div className="progress-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}

        {success && (
          <div className="success-message">
            <CheckCircle size={24} />
            <p>System discovered successfully! Configuration updated.</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        )}

        <div className="upload-requirements">
          <h4>CSV Requirements:</h4>
          <ul>
            <li><strong>CaseID:</strong> Unique identifier for each job (e.g., Job_1, Job_2)</li>
            <li><strong>Activity:</strong> Station name (e.g., Drilling, Assembly)</li>
            <li><strong>Timestamp:</strong> Event time in seconds</li>
            <li><strong>Lifecycle:</strong> Event type (START, COMPLETE, QUEUE_ENTER)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
