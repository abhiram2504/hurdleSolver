import React from "react";
import "./ErrorMessage.css";

interface ErrorMessageProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
}) => {
  if (!error) return null;

  return (
    <div className="error-message">
      <div className="error-content">
        <span className="error-icon">⚠️</span>
        <span className="error-text">{error}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="error-dismiss">
            ×
          </button>
        )}
      </div>
    </div>
  );
};
