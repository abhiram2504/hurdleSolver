interface ProgressBarProps {
  totalHurdles: number;
  currentHurdle: number;
  xp: number;
  streak: number;
}

export default function ProgressBar({
  totalHurdles,
  currentHurdle,
  xp,
  streak,
}: ProgressBarProps) {
  const progressPercentage = Math.round((currentHurdle / totalHurdles) * 100);
  const isComplete = currentHurdle >= totalHurdles;

  return (
    <div className="progress-container">
      {/* Main Progress Bar */}
      <div className="progress-bar-wrapper">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="progress-bar-glow"></div>
          </div>
        </div>

        {/* Progress Text */}
        <div className="progress-text">
          {isComplete ? (
            <span className="complete-text">🎉 Complete! 🎉</span>
          ) : (
            <span>
              {currentHurdle} / {totalHurdles} Hurdles ({progressPercentage}%)
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-icon">🎯</span>
          <span className="stat-label">XP</span>
          <span className="stat-value">{xp}</span>
        </div>

        <div className="stat-item">
          <span className="stat-icon">🔥</span>
          <span className="stat-label">Streak</span>
          <span className="stat-value">{streak}</span>
        </div>

        <div className="stat-item">
          <span className="stat-icon">📚</span>
          <span className="stat-label">Progress</span>
          <span className="stat-value">{progressPercentage}%</span>
        </div>
      </div>

      {/* Milestone Markers */}
      <div className="milestone-markers">
        {Array.from({ length: totalHurdles }, (_, index) => {
          const isBoss = (index + 1) % 5 === 0;
          const isCompleted = index < currentHurdle;
          const isCurrent = index === currentHurdle;

          return (
            <div
              key={index}
              className={`milestone ${isCompleted ? "completed" : ""} ${
                isCurrent ? "current" : ""
              } ${isBoss ? "boss" : ""}`}
              style={{
                left: `${((index + 1) / totalHurdles) * 100}%`,
              }}
              title={
                isBoss ? `Boss Battle ${index + 1}` : `Hurdle ${index + 1}`
              }
            >
              {isBoss ? "👑" : isCompleted ? "⭐" : isCurrent ? "📍" : "⚪"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
