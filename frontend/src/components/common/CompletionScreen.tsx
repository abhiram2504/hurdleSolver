import React from "react";
import type { Progress } from "../../types";
import "./CompletionScreen.css";

interface CompletionScreenProps {
  progress: Progress;
  onShowImprovements: () => void;
  onRestart: () => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  progress,
  onShowImprovements,
  onRestart,
}) => {
  return (
    <div className="completion-screen">
      <div className="completion-content">
        <div className="completion-header">
          <h2>🎉 Congratulations! 🎉</h2>
          <p>You've completed all the questions!</p>
        </div>

        <div className="completion-stats">
          <div className="stat-item">
            <div className="stat-value">{progress.current}</div>
            <div className="stat-label">Questions Completed</div>
          </div>
        </div>

        <div className="completion-actions">
          <button onClick={onShowImprovements} className="performance-btn">
            📊 View Summary
          </button>
          <button onClick={onRestart} className="restart-btn">
            🔄 Try Another Document
          </button>
        </div>
      </div>
    </div>
  );
};
