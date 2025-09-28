import { useState } from "react";
import "./App.css";
import "./ProgressBar.css";
import ProgressBar from "./ProgressBar";
import HomeScreen3D from "./HomeScreen3D";

interface Task {
  type: string;
  question?: string;
  options?: string[];
  correct?: number;
  explanation?: string;
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
  document_text?: string;
  document_title?: string;
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
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [feedback, setFeedback] = useState<{
    show: boolean;
    correct: boolean;
    score: number;
    explanation: string;
  } | null>(null);

  // Handle home screen upload click
  const handleHomeUploadClick = () => {
    setShowHomeScreen(false);
  };

  // Handle PDF upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:5002/api/upload", {
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
      const res = await fetch(`http://localhost:5002/api/hurdle/${id}`);
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
      const res = await fetch(`http://localhost:5002/api/hurdle/${pdfId}`, {
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
      const res = await fetch(`http://localhost:5002/api/hurdle/${pdfId}`, {
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
        explanation: data.explanation || "",
      });

      setProgress(data);
      setAnswer("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle skip question
  const handleSkipQuestion = async () => {
    if (!pdfId || !hurdle) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5002/api/hurdle/${pdfId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skip: true,
        }),
      });
      const data = await res.json();

      // Show feedback for skip
      setFeedback({
        show: true,
        correct: false,
        score: 0,
        explanation: data.explanation || "Question skipped.",
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

    // Only handle multiple choice questions

    if (task.type === "choice") {
      return (
        <div className="hurdle-task choice-task">
          <h3>Multiple Choice 🎯</h3>
          <div className="difficulty">
            Difficulty: {"⭐".repeat(hurdle.difficulty || 1)}
          </div>
          <div className="task-content">
            <h4 className="question-text">{task.question}</h4>
            <div className="options-container">
              {task.options?.map((option, idx) => (
                <label key={idx} className="option-label">
                  <input
                    type="radio"
                    name="choice"
                    value={idx}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="option-radio"
                  />
                  <span className="option-text">
                    <strong>{String.fromCharCode(65 + idx)}.</strong> {option}
                  </span>
                </label>
              ))}
            </div>
            <div className="answer-section">
              <button
                onClick={() => handleGameComplete(true, 100, parseInt(answer))}
                disabled={loading || answer === ""}
                className="submit-btn"
              >
                {loading ? "Submitting..." : "Submit Answer"}
              </button>
              <button
                onClick={handleSkipQuestion}
                disabled={loading}
                className="skip-btn"
              >
                Skip Question
              </button>
            </div>
          </div>
        </div>
      );
    }

    // No fallback needed - we only support choice and cloze
    return null;
  };

  // Show 3D home screen if no PDF is uploaded yet
  if (showHomeScreen && !pdfId) {
    return <HomeScreen3D onUploadClick={handleHomeUploadClick} />;
  }

  return (
    <div className="app-container">
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={() => {
            setShowHomeScreen(true);
            setPdfId(null);
            setHurdle(null);
            setProgress({ xp: 0, streak: 0, current: 0 });
            setFile(null);
            setDone(false);
            setFeedback(null);
          }}
          style={{
            background: "linear-gradient(45deg, #667eea, #764ba2)",
            border: "none",
            borderRadius: "12px",
            padding: "8px 16px",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          🏠 Home
        </button>
        <div>
          <h1>HurdleReader</h1>
          <p className="subtitle">Gamified Reading & Quizzes from PDFs</p>
        </div>
      </div>
      {pdfId && numChunks > 0 && (
        <ProgressBar
          totalHurdles={numChunks}
          currentHurdle={progress.current}
          xp={progress.xp}
          streak={progress.streak}
        />
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
            <div className="score-display">
              <div className="score-number">{feedback.score.toFixed(0)}</div>
              <div className="score-label">Score</div>
            </div>
            {feedback.explanation && (
              <div className="explanation-text">{feedback.explanation}</div>
            )}
            <button onClick={continueToNext} className="continue-btn">
              Continue to Next Question
            </button>
          </div>
        </div>
      )}
      {pdfId && !done && (
        <div className="main-content">
          <div className="question-section">{renderTask()}</div>

          <div className="document-preview">
            <div className="document-header">
              <h3>📄 {hurdle?.document_title || "Document"}</h3>
            </div>
            <div className="document-content">
              {hurdle?.document_text && (
                <div className="document-text">
                  {hurdle.document_text.split("\n\n").map((paragraph, idx) => (
                    <p
                      key={idx}
                      className={
                        hurdle.chunk.includes(paragraph.substring(0, 50))
                          ? "current-chunk"
                          : ""
                      }
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
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
