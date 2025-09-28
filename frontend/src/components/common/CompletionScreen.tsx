import React from "react";
import type { Progress } from "../../types";
import "./CompletionScreen.css";

interface CompletionScreenProps {
  progress: Progress;
  onShowPerformance: () => void;
  onRestart: () => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  progress,
  onShowPerformance,
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
            <div className="stat-value">{progress.xp}</div>
            <div className="stat-label">XP Earned</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{progress.streak}</div>
            <div className="stat-label">Final Streak</div>
          </div>
        </div>

        <div className="completion-actions">
          <button onClick={onShowPerformance} className="performance-btn">
            📊 View Performance
          </button>
          <button onClick={onRestart} className="restart-btn">
            🔄 Try Another Document
          </button>
        </div>
      </div>
    </div>
  );
};
