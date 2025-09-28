import React from "react";
import "./ImprovementModal.css";

interface CompletionStats {
  correct: number;
  wrong: number;
  skipped: number;
  average_time: number;
}

interface CompletionModalProps {
  show: boolean;
  message: string | null;
  stats: CompletionStats | null;
  loading: boolean;
  onClose: () => void;
  onRestart: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  show,
  message,
  stats,
  loading,
  onClose,
  onRestart,
}) => {
  if (!show) return null;

  return (
    <div className="improvement-modal">
      <div className="improvement-content">
        <div className="improvement-header">
          <h2>🎉 Learning Complete!</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        {loading ? (
          <div className="loading-section">
            <div className="spinner"></div>
            <p>Preparing your summary...</p>
          </div>
        ) : message ? (
          <div className="improvement-details">
            <div className="suggestions-section">
              <h3>📊 Your Learning Summary</h3>
              <div className="suggestions-text">
                <p>{message}</p>
              </div>

              {stats && (
                <div className="stats-section">
                  <h4>📈 Performance Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-item correct">
                      <span className="stat-icon">✅</span>
                      <span className="stat-label">Correct</span>
                      <span className="stat-value">{stats.correct}</span>
                    </div>
                    <div className="stat-item wrong">
                      <span className="stat-icon">❌</span>
                      <span className="stat-label">Wrong</span>
                      <span className="stat-value">{stats.wrong}</span>
                    </div>
                    <div className="stat-item skipped">
                      <span className="stat-icon">⏭️</span>
                      <span className="stat-label">Skipped</span>
                      <span className="stat-value">{stats.skipped}</span>
                    </div>
                    <div className="stat-item time">
                      <span className="stat-icon">⏱️</span>
                      <span className="stat-label">Avg Time</span>
                      <span className="stat-value">{stats.average_time}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="improvement-actions">
              <button onClick={onRestart} className="restart-btn">
                🔄 Try Another Document
              </button>
              <button onClick={onClose} className="close-improvement-btn">
                🏠 Back to Home
              </button>
            </div>
          </div>
        ) : (
          <div className="error-section">
            <p>Unable to generate summary at this time.</p>
            <button onClick={onClose} className="close-improvement-btn">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Keep the old export for compatibility
export const ImprovementModal = CompletionModal;
