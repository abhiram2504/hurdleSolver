import React from "react";
import type { PerformanceData } from "../../types";
import "./PerformanceModal.css";

interface PerformanceModalProps {
  show: boolean;
  performanceData: PerformanceData | null;
  loading: boolean;
  onClose: () => void;
  onRestart: () => void;
}

export const PerformanceModal: React.FC<PerformanceModalProps> = ({
  show,
  performanceData,
  loading,
  onClose,
  onRestart,
}) => {
  if (!show) return null;

  return (
    <div className="performance-modal">
      <div className="performance-content">
        <div className="performance-header">
          <h2>📊 Your Performance</h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        {loading ? (
          <div className="loading-section">
            <div className="spinner"></div>
            <p>Analyzing your performance...</p>
          </div>
        ) : performanceData ? (
          <div className="performance-details">
            <div className="performance-summary">
              <div className="stat-card">
                <div className="stat-number">
                  {performanceData.total_questions}
                </div>
                <div className="stat-label">Total Questions</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {performanceData.correct_answers}
                </div>
                <div className="stat-label">Correct Answers</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {Math.round(performanceData.accuracy * 100)}%
                </div>
                <div className="stat-label">Accuracy</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {Math.round(performanceData.average_time)}s
                </div>
                <div className="stat-label">Avg Time</div>
              </div>
            </div>

            {performanceData.topics && performanceData.topics.length > 0 && (
              <div className="topics-section">
                <h3>📚 Performance by Topic</h3>
                <div className="topics-list">
                  {performanceData.topics.map((topic, idx) => (
                    <div key={idx} className="topic-item">
                      <div className="topic-name">{topic.topic}</div>
                      <div className="topic-stats">
                        <span className="topic-accuracy">
                          {Math.round(topic.accuracy * 100)}% accuracy
                        </span>
                        <span className="topic-time">
                          {Math.round(topic.avg_time)}s avg
                        </span>
                        <span className="topic-count">
                          {topic.questions_count} questions
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="performance-actions">
              <button onClick={onRestart} className="restart-btn">
                🔄 Try Another Document
              </button>
              <button onClick={onClose} className="close-performance-btn">
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="error-section">
            <p>Unable to load performance data.</p>
            <button onClick={onClose} className="close-performance-btn">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
