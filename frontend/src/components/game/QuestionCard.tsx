import React, { useState, useEffect } from "react";
import type { Task, QuestionProgress } from "../../types";
import { BuckeyeAvatar } from "../avatar/BuckeyeAvatar";
import "./QuestionCard.css";

interface QuestionCardProps {
  task: Task;
  timer: number;
  progress: { current: number };
  numChunks: number;
  questionProgress?: QuestionProgress;
  onSubmit: (answer: any) => void;
  onSkip: () => void;
  loading: boolean;
  feedback?: {
    correct: boolean;
    explanation: string;
    hint?: string;
  } | null;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  task,
  timer,
  progress,
  numChunks,
  questionProgress,
  onSubmit,
  onSkip,
  loading,
  feedback,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  // Show feedback when it's provided
  useEffect(() => {
    if (feedback) {
      setShowFeedback(true);
      // Auto-hide feedback after 3 seconds for correct answers
      if (feedback.correct) {
        const timer = setTimeout(() => {
          setShowFeedback(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setShowFeedback(false);
    }
  }, [feedback]);

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

  const renderMultipleChoice = () => {
    const getOptionClass = (idx: number) => {
      let classes = "option-label";

      if (showFeedback && feedback) {
        if (selectedOption === idx) {
          // Show user's selected answer
          classes += feedback.correct
            ? " option-correct-selected"
            : " option-incorrect-selected";
        }
        if (!feedback.correct && idx === task.correct) {
          // Show correct answer when user is wrong
          classes += " option-correct-answer";
        }
      }

      return classes;
    };

    return (
      <div className="question-container">
        <h3 className="question-text">{task.question}</h3>
        <div className="options-container">
          {task.options?.map((option, idx) => (
            <label key={idx} className={getOptionClass(idx)}>
              <input
                type="radio"
                name="answer"
                value={idx}
                checked={selectedOption === idx}
                onChange={() => setSelectedOption(idx)}
                className="option-radio"
                disabled={loading || showFeedback}
              />
              <span className="option-text">{option}</span>
              {showFeedback &&
                feedback &&
                selectedOption === idx &&
                !feedback.correct && (
                  <span className="option-indicator">❌</span>
                )}
              {showFeedback &&
                feedback &&
                !feedback.correct &&
                idx === task.correct && (
                  <span className="option-indicator">✅</span>
                )}
            </label>
          ))}
        </div>
      </div>
    );
  };

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
      {/* Buckeye Avatar Section */}
      <div className="avatar-section">
        <BuckeyeAvatar
          size="medium"
          mood={
            showFeedback && feedback
              ? feedback.correct
                ? "correct"
                : "incorrect"
              : "thinking"
          }
          animate={true}
        />
        {showFeedback && feedback && !feedback.correct && feedback.hint && (
          <div className="avatar-hint">
            <p>
              <strong>💡 Hint:</strong> {feedback.hint}
            </p>
          </div>
        )}
      </div>

      <div className="question-meta">
        <span className="timer">⏱️ Time: {timer}s</span>
        <div className="progress-indicator">
          {questionProgress ? (
            <div className="detailed-progress">
              <div className="chunk-progress">
                Module {questionProgress.chunk_number} of{" "}
                {questionProgress.total_chunks}
              </div>
              <div className="question-progress">
                Question {questionProgress.current_question} of{" "}
                {questionProgress.total_questions}
              </div>
            </div>
          ) : (
            <span>
              Question {progress.current + 1} of {numChunks}
            </span>
          )}
        </div>
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
