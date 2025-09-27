import { useState } from "react";
import "./App.css";
import "./InteractiveGames.css";
import Roadmap3D from "./Roadmap3D";
import { MatchingGame, TypingGame, HighlightGame } from "./InteractiveGames";

interface Task {
  type: string;
  question?: string;
  answer?: string;
  hint?: string;
  options?: string[];
  correct?: number;
  explanation?: string;
  instruction?: string;
  correct_phrases?: string[];
  questions?: Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
  title?: string;
  difficulty?: number;
}

interface Hurdle {
  chunk: string;
  task: Task;
  task_type: string;
  is_boss: boolean;
  idx: number;
  difficulty?: number;
  key_concepts?: string[];
}

interface Progress {
  xp: number;
  streak: number;
  current: number;
}

function App() {
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [numChunks, setNumChunks] = useState<number>(0);
  const [hurdle, setHurdle] = useState<Hurdle | null>(null);
  const [progress, setProgress] = useState<Progress>({
    xp: 0,
    streak: 0,
    current: 0,
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    show: boolean;
    correct: boolean;
    score: number;
    feedback: string;
    explanation: string;
    message: string;
  } | null>(null);

  // Handle PDF upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPdfId(data.pdf_id);
      setNumChunks(data.num_chunks);
      setProgress({ xp: 0, streak: 0, current: 0 });
      setDone(false);
      fetchHurdle(data.pdf_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch next hurdle
  const fetchHurdle = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/hurdle/${id}`);
      const data = await res.json();
      if (data.done) {
        setDone(true);
        setHurdle(null);
        return;
      }
      setHurdle(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit answer (for MVP, always correct)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfId || !hurdle) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/hurdle/${pdfId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct: true, answer }),
      });
      const data = await res.json();
      setProgress(data);
      setAnswer("");
      fetchHurdle(pdfId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle game completion
  const handleGameComplete = async (
    correct: boolean,
    score: number,
    userAnswer?: any
  ) => {
    if (!pdfId || !hurdle) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/hurdle/${pdfId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: userAnswer || answer,
          task_type: hurdle.task_type,
          correct,
          score,
        }),
      });
      const data = await res.json();

      // Show feedback
      setFeedback({
        show: true,
        correct: data.correct,
        score: data.score,
        feedback: data.feedback,
        explanation: data.explanation,
        message: data.message,
      });

      setProgress(data);
      setAnswer("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Continue to next hurdle after viewing feedback
  const continueToNext = () => {
    setFeedback(null);
    if (pdfId) {
      fetchHurdle(pdfId);
    }
  };

  // UI for AI-generated tasks
  const renderTask = () => {
    if (!hurdle) return null;

    const task = hurdle.task;

    if (hurdle.is_boss) {
      return (
        <div className="boss-battle">
          <h2>{task.title || "Boss Battle! 🏆"}</h2>
          <div className="difficulty">
            Difficulty: {"⭐".repeat(task.difficulty || 5)}
          </div>
          <p>{hurdle.chunk}</p>

          {task.questions &&
            task.questions.map((q, idx) => (
              <div key={idx} className="boss-question">
                <h4>{q.question}</h4>
                {q.options.map((option, optIdx) => (
                  <label key={optIdx} className="option">
                    <input
                      type="radio"
                      name={`boss-q-${idx}`}
                      value={optIdx}
                      onChange={(e) => setAnswer(`${idx}-${e.target.value}`)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            ))}

          <button onClick={handleSubmit} disabled={loading || !answer}>
            Complete Boss Battle
          </button>
        </div>
      );
    }

    // Render interactive games based on task type
    if (task.type === "matching") {
      return <MatchingGame task={task} onComplete={handleGameComplete} />;
    }

    // Traditional task types
    if (task.type === "cloze") {
      return (
        <div className="hurdle-task cloze-task">
          <h3>Fill in the Blanks 📝</h3>
          <div className="difficulty">
            Difficulty: {"⭐".repeat(hurdle.difficulty || 1)}
          </div>
          <p className="chunk-text">{hurdle.chunk}</p>
          <div className="task-content">
            <p>{task.question}</p>
            {task.hint && <div className="hint">💡 Hint: {task.hint}</div>}
            <input
              type="text"
              placeholder="Fill in the blank..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={loading}
            />
          </div>
          <button onClick={handleSubmit} disabled={loading || !answer}>
            Submit Answer
          </button>
        </div>
      );
    }

    if (task.type === "choice") {
      return (
        <div className="hurdle-task choice-task">
          <h3>Multiple Choice 🎯</h3>
          <div className="difficulty">
            Difficulty: {"⭐".repeat(hurdle.difficulty || 1)}
          </div>
          <p className="chunk-text">{hurdle.chunk}</p>
          <div className="task-content">
            <h4>{task.question}</h4>
            {task.options?.map((option, idx) => (
              <label key={idx} className="option">
                <input
                  type="radio"
                  name="choice"
                  value={idx}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                {option}
              </label>
            ))}
          </div>
          <button
            onClick={() => handleGameComplete(true, 100, answer)}
            disabled={loading || !answer}
          >
            Submit Answer
          </button>
        </div>
      );
    }

    if (task.type === "highlight") {
      return (
        <div className="hurdle-task highlight-task">
          <h3>Highlight Key Information 🔍</h3>
          <div className="difficulty">
            Difficulty: {"⭐".repeat(hurdle.difficulty || 1)}
          </div>
          <p className="chunk-text">{hurdle.chunk}</p>
          <div className="task-content">
            <p>{task.instruction}</p>
            <textarea
              placeholder="Type the key phrases you would highlight..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={loading}
            />
          </div>
          <button onClick={handleSubmit} disabled={loading || !answer}>
            Submit Highlights
          </button>
        </div>
      );
    }

    // Fallback
    return (
      <div className="hurdle-task">
        <h3>🎮 Learning Game</h3>
        <p>{hurdle.chunk}</p>
        <input
          type="text"
          placeholder="Your answer..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={loading}
        />
        <button onClick={handleSubmit} disabled={loading || !answer}>
          Submit
        </button>
      </div>
    );
  };

  return (
    <div className="app-container">
      <h1>HurdleReader</h1>
      <p className="subtitle">Gamified Reading & Quizzes from PDFs</p>
      {pdfId && numChunks > 0 && (
        <Roadmap3D totalHurdles={numChunks} currentHurdle={progress.current} />
      )}
      {!pdfId && (
        <form onSubmit={handleUpload} className="upload-form">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !file}>
            Upload PDF
          </button>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading...</div>}

      {/* Feedback Modal */}
      {feedback && feedback.show && (
        <div className="feedback-modal">
          <div className="feedback-content">
            <h3>{feedback.correct ? "🎉 Correct!" : "❌ Incorrect"}</h3>
            <div className="score">Score: {feedback.score.toFixed(0)}%</div>
            <div className="feedback-text">{feedback.feedback}</div>
            <div className="explanation">{feedback.explanation}</div>
            <div className="message">{feedback.message}</div>
            <button onClick={continueToNext} className="continue-btn">
              Continue to Next Hurdle
            </button>
          </div>
        </div>
      )}
      {pdfId && !done && (
        <div className="hurdle-section">
          <div className="progress-bar">
            <div
              className="progress"
              style={{ width: `${(progress.current / numChunks) * 100 || 0}%` }}
            />
          </div>
          <div className="stats">
            <span>🎯 XP: {progress.xp}</span>
            <span>🔥 Streak: {progress.streak}</span>
            <span>
              📚 Hurdle: {progress.current + 1} / {numChunks}
            </span>
          </div>

          {hurdle && hurdle.key_concepts && (
            <div className="key-concepts">
              <h4>🔑 Key Concepts:</h4>
              <div className="concepts">
                {hurdle.key_concepts.map((concept, idx) => (
                  <span key={idx} className="concept-tag">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {renderTask()}
        </div>
      )}
      {done && (
        <div className="done-section">
          <h2>🎉 You finished the PDF! 🎉</h2>
          <p>Total XP: {progress.xp}</p>
          <p>Streak: {progress.streak}</p>
          <button
            onClick={() => {
              setPdfId(null);
              setHurdle(null);
              setProgress({ xp: 0, streak: 0, current: 0 });
              setFile(null);
              setDone(false);
            }}
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
