import React from 'react';
import { Upload } from 'lucide-react';
import './EmptyState.css';

function EmptyState({ title, message, actionText, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-card">
        <div className="empty-state-icon">
          <Upload size={64} />
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        <button className="btn btn-primary" onClick={onAction}>
          {actionText}
        </button>
      </div>
    </div>
  );
}

export default EmptyState;
