import React, { useEffect, useState } from "react";
import { BuckeyeAvatar } from "../avatar/BuckeyeAvatar";
import "./StoryProgress.css";

interface StoryNode {
  id: number;
  type: "lesson" | "checkpoint" | "boss";
  completed: boolean;
  current: boolean;
  locked: boolean;
  title: string;
  description?: string;
}

interface StoryProgressProps {
  totalHurdles: number;
  currentHurdle: number;
  completedHurdles: number;
  onNodeClick?: (nodeId: number) => void;
}

export const StoryProgress: React.FC<StoryProgressProps> = ({
  totalHurdles,
  currentHurdle,
  completedHurdles,
  onNodeClick,
}) => {
  const [nodes, setNodes] = useState<StoryNode[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const generateNodes = () => {
      const newNodes: StoryNode[] = [];

      for (let i = 0; i < totalHurdles; i++) {
        const isCompleted = i < completedHurdles;
        const isCurrent = i === currentHurdle;
        const isLocked = i > currentHurdle;

        // Every 5th node is a checkpoint, every 10th is a boss
        let type: "lesson" | "checkpoint" | "boss" = "lesson";
        if (i > 0 && (i + 1) % 10 === 0) {
          type = "boss";
        } else if (i > 0 && (i + 1) % 5 === 0) {
          type = "checkpoint";
        }

        newNodes.push({
          id: i,
          type,
          completed: isCompleted,
          current: isCurrent,
          locked: isLocked,
          title: `${
            type === "boss"
              ? "Boss Battle"
              : type === "checkpoint"
              ? "Checkpoint"
              : "Lesson"
          } ${i + 1}`,
          description:
            type === "boss"
              ? "Final Challenge!"
              : type === "checkpoint"
              ? "Progress Check"
              : "Learning Module",
        });
      }

      return newNodes;
    };

    setNodes(generateNodes());
  }, [totalHurdles, currentHurdle, completedHurdles]);

  useEffect(() => {
    // Show celebration when completing a hurdle
    if (completedHurdles > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [completedHurdles]);

  const getAvatarMood = () => {
    if (showCelebration) return "celebrating";
    if (currentHurdle === totalHurdles) return "excited";
    return "happy";
  };

  const getPathPosition = (index: number) => {
    const pathWidth = 300; // Width of the path container
    const amplitude = 80; // How much the path curves
    const frequency = 0.3; // How often it curves

    // Calculate position along a sine wave
    const progress = index / Math.max(totalHurdles - 1, 1);
    const x = progress * pathWidth;
    const y = Math.sin(progress * Math.PI * frequency * 4) * amplitude;

    return { x, y: y + 200 }; // Offset Y to center the path
  };

  return (
    <div className="story-progress">
      {/* Header with Avatar and Stats */}
      <div className="story-header">
        <div className="avatar-section">
          <BuckeyeAvatar mood={getAvatarMood()} size="large" animate={true} />
        </div>

        <div className="stats-section">

          <div className="stat-card progress-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <div className="stat-value">
                {completedHurdles}/{totalHurdles}
              </div>
              <div className="stat-label">Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Path */}
      <div className="story-path-container">
        <svg
          className="path-background"
          viewBox="0 0 320 400"
          preserveAspectRatio="none"
        >
          {/* Path Line */}
          <path
            d={`M 10 200 ${nodes
              .map((_, i) => {
                const pos = getPathPosition(i);
                return `L ${pos.x + 10} ${pos.y}`;
              })
              .join(" ")}`}
            stroke="url(#pathGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className="story-path-line"
          />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>
          </defs>
        </svg>

        {/* Story Nodes */}
        <div className="story-nodes">
          {nodes.map((node, index) => {
            const position = getPathPosition(index);

            return (
              <div
                key={node.id}
                className={`story-node ${node.type} ${
                  node.completed ? "completed" : ""
                } ${node.current ? "current" : ""} ${
                  node.locked ? "locked" : ""
                }`}
                style={{
                  left: `${position.x}px`,
                  top: `${position.y - 25}px`,
                }}
                onClick={() => !node.locked && onNodeClick?.(node.id)}
              >
                {/* Node Circle */}
                <div className="node-circle">
                  <div className="node-inner">
                    {node.completed && <span className="node-check">✓</span>}
                    {node.current && !node.completed && (
                      <span className="node-current">●</span>
                    )}
                    {node.locked && <span className="node-lock">🔒</span>}
                    {!node.current && !node.completed && !node.locked && (
                      <span className="node-number">{node.id + 1}</span>
                    )}
                  </div>

                  {/* Node Glow Effect */}
                  {(node.current || node.completed) && (
                    <div className="node-glow"></div>
                  )}
                </div>

                {/* Node Info Tooltip */}
                <div className="node-tooltip">
                  <div className="tooltip-title">{node.title}</div>
                  <div className="tooltip-description">{node.description}</div>
                </div>

                {/* Special Effects for Boss Nodes */}
                {node.type === "boss" && <div className="boss-crown">👑</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chapter Completion Celebration */}
      {showCelebration && (
        <div className="chapter-celebration">
          <div className="celebration-content">
            <div className="celebration-avatar">
              <BuckeyeAvatar size="large" mood="celebrating" animate={true} />
            </div>
            <h2>🎉 Lesson Complete! 🎉</h2>
            <p>Excellent work! You're making great progress!</p>
            <div className="celebration-stats">
              <div className="celebration-progress">
                🎉 Module {completedHurdles} Complete!
              </div>
            </div>
            <div className="celebration-message">
              {completedHurdles % 5 === 0
                ? "🏆 Checkpoint Reached!"
                : "📚 Keep Learning!"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
