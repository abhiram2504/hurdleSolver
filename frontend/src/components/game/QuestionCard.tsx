import React, { useState } from "react";
import type { Task } from "../../types";
import "./QuestionCard.css";

interface QuestionCardProps {
  task: Task;
  timer: number;
  progress: { current: number };
  numChunks: number;
  onSubmit: (answer: any) => void;
  onSkip: () => void;
  loading: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  task,
  timer,
  progress,
  numChunks,
  onSubmit,
  onSkip,
  loading,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (task.type === "choice") {
      if (selectedOption !== null) {
        onSubmit(selectedOption);
      }
    } else if (task.type === "cloze") {
      if (answer.trim()) {
        onSubmit(answer.trim());
      }
    }
  };

  const renderMultipleChoice = () => (
    <div className="question-container">
      <h3 className="question-text">{task.question}</h3>
      <div className="options-container">
        {task.options?.map((option, idx) => (
          <label key={idx} className="option-label">
            <input
              type="radio"
              name="answer"
              value={idx}
              checked={selectedOption === idx}
              onChange={() => setSelectedOption(idx)}
              className="option-radio"
              disabled={loading}
            />
            <span className="option-text">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderFillInBlank = () => (
    <div className="question-container">
      <h3 className="question-text">{task.question}</h3>
      <div className="answer-section">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          className="answer-input"
          disabled={loading}
        />
      </div>
    </div>
  );

  const isAnswerReady = () => {
    if (task.type === "choice") return selectedOption !== null;
    if (task.type === "cloze") return answer.trim().length > 0;
    return false;
  };

  return (
    <div className="question-card">
      <div className="question-meta">
        <span className="timer">⏱️ Time: {timer}s</span>
        <span className="progress-indicator">
          Question {progress.current + 1} of {numChunks}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        {task.type === "choice" && renderMultipleChoice()}
        {task.type === "cloze" && renderFillInBlank()}

        <div className="question-actions">
          <button
            type="submit"
            disabled={!isAnswerReady() || loading}
            className="submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Checking...
              </>
            ) : (
              <>
                <span>✓</span>
                Submit Answer
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="skip-btn"
          >
            <span>⏭️</span>
            Skip Question
          </button>
        </div>
      </form>
    </div>
  );
};
