import React from "react";
import "./BuckeyeAvatar.css";

interface BuckeyeAvatarProps {
  mood?:
    | "happy"
    | "excited"
    | "thinking"
    | "celebrating"
    | "encouraging"
    | "sleeping"
    | "correct"
    | "incorrect"
    | "hint";
  size?: "small" | "medium" | "large";
  animate?: boolean;
}

export const BuckeyeAvatar: React.FC<BuckeyeAvatarProps> = ({
  mood = "happy",
  size = "medium",
  animate = true,
}) => {
  const getEyeExpression = () => {
    switch (mood) {
      case "excited":
      case "correct":
        return "eyes-excited";
      case "thinking":
      case "hint":
        return "eyes-thinking";
      case "celebrating":
        return "eyes-celebrating";
      case "encouraging":
        return "eyes-encouraging";
      case "sleeping":
        return "eyes-sleeping";
      case "incorrect":
        return "eyes-sad";
      default:
        return "eyes-happy";
    }
  };

  const getMouthExpression = () => {
    switch (mood) {
      case "excited":
      case "correct":
        return "mouth-excited";
      case "thinking":
      case "hint":
        return "mouth-thinking";
      case "celebrating":
        return "mouth-celebrating";
      case "encouraging":
        return "mouth-encouraging";
      case "sleeping":
        return "mouth-sleeping";
      case "incorrect":
        return "mouth-sad";
      default:
        return "mouth-happy";
    }
  };

  return (
    <div className={`buckeye-avatar ${size} ${animate ? "animate" : ""}`}>
      {/* Buckeye Shell */}
      <div className="buckeye-shell">
        {/* Shell Pattern */}
        <div className="shell-pattern">
          <div className="shell-stripe stripe-1"></div>
          <div className="shell-stripe stripe-2"></div>
          <div className="shell-stripe stripe-3"></div>
        </div>

        {/* Shine Effect */}
        <div className="shell-shine"></div>
      </div>

      {/* Face */}
      <div className="buckeye-face">
        {/* Eyes */}
        <div className={`eyes ${getEyeExpression()}`}>
          <div className="eye left-eye">
            <div className="pupil"></div>
            <div className="eye-shine"></div>
          </div>
          <div className="eye right-eye">
            <div className="pupil"></div>
            <div className="eye-shine"></div>
          </div>
        </div>

        {/* Eyebrows */}
        <div className="eyebrows">
          <div className="eyebrow left-eyebrow"></div>
          <div className="eyebrow right-eyebrow"></div>
        </div>

        {/* Mouth */}
        <div className={`mouth ${getMouthExpression()}`}>
          <div className="mouth-inner"></div>
        </div>

        {/* Cheeks (for blushing) */}
        {(mood === "excited" || mood === "celebrating") && (
          <div className="cheeks">
            <div className="cheek left-cheek"></div>
            <div className="cheek right-cheek"></div>
          </div>
        )}
      </div>

      {/* Arms */}
      <div className="buckeye-arms">
        <div className="arm left-arm"></div>
        <div className="arm right-arm"></div>
      </div>

      {/* Celebration particles */}
      {mood === "celebrating" && (
        <div className="celebration-particles">
          <div className="particle particle-1">✨</div>
          <div className="particle particle-2">🎉</div>
          <div className="particle particle-3">⭐</div>
          <div className="particle particle-4">✨</div>
        </div>
      )}

      {/* Speech bubble for different moods */}
      {(mood === "encouraging" ||
        mood === "correct" ||
        mood === "incorrect" ||
        mood === "hint") && (
        <div className="speech-bubble">
          <div className="bubble-content">
            {mood === "encouraging" && "You got this! 💪"}
            {mood === "correct" && "🎉 Correct! Great job!"}
            {mood === "incorrect" && "❌ Not quite right. Try again!"}
            {mood === "hint" && "💡 Think about the key concepts..."}
          </div>
          <div className="bubble-tail"></div>
        </div>
      )}
    </div>
  );
};
