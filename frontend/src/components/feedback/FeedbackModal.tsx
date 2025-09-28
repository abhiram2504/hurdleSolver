import React from "react";
import type { Feedback } from "../../types";
import "./FeedbackModal.css";

interface FeedbackModalProps {
  feedback: Feedback;
  onContinue: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  feedback,
  onContinue,
}) => {
  if (!feedback.show || !feedback.correct) return null;

  return (
    <div className="feedback-modal">
      <div className="feedback-content">
        <div className="feedback-header">
          <span className="feedback-icon">✅</span>
          <h3>Correct!</h3>
        </div>

        <div className="score-display">
          <div className="score-number">{feedback.score}</div>
          <div className="score-label">Score</div>
        </div>

        {feedback.explanation && (
          <div className="explanation-section">
            <h4>💡 Explanation</h4>
            <p className="explanation-text">{feedback.explanation}</p>
          </div>
        )}

        <button onClick={onContinue} className="continue-btn">
          Continue
        </button>
      </div>
    </div>
  );
};

interface InlineFeedbackProps {
  feedback: Feedback;
}

export const InlineFeedback: React.FC<InlineFeedbackProps> = ({ feedback }) => {
  if (!feedback.show || feedback.correct) return null;

  return (
    <div className="inline-feedback incorrect">
      <span>❌ Incorrect. Moving to the next question.</span>
    </div>
  );
};
