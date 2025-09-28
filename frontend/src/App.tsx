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
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    show: boolean;
    correct: boolean;
    score: number;
    explanation: string;
  } | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<number | null>(null);

  // Handle home screen upload click
  const handleHomeUploadClick = () => {
    setShowHomeScreen(false);
  };

  const resetToHome = () => {
    setShowHomeScreen(true);
    setPdfId(null);
    setHurdle(null);
    setProgress({ xp: 0, streak: 0, current: 0 });
    setFile(null);
    setDone(false);
    setFeedback(null);
    setPerformanceData(null);
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
      // Start timing when question is loaded
      setQuestionStartTime(Date.now());
      if (timerInterval) {
        window.clearInterval(timerInterval);
      }
      const intervalId = window.setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      setTimerInterval(intervalId);
      setTimer(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit answer (for MVP, always correct)
  const handleGameComplete = async (
    correct: boolean,
    score: number,
    userAnswer?: any
  ) => {
    if (!pdfId || !hurdle) return;
    setLoading(true);
    setError(null);

    // Calculate time taken
    const timeMs = questionStartTime ? Date.now() - questionStartTime : 0;

    try {
      const res = await fetch(`http://localhost:5002/api/hurdle/${pdfId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: userAnswer || answer,
          task_type: hurdle.task_type,
          correct,
          score,
          time_ms: timeMs,
        }),
      });
      const data = await res.json();

      if (!data.correct) {
        // Incorrect answer: show text feedback instead of modal and fetch next question
        setFeedback({
          show: true,
          correct: false,
          score: data.score,
          explanation: "",
        });
        setProgress(data);
        setAnswer("");
        setQuestionStartTime(null);
        if (timerInterval) {
          window.clearInterval(timerInterval);
          setTimerInterval(null);
        }
        fetchHurdle(pdfId);
        return;
      }

      // Show feedback for correct answer (modal)
      setFeedback({
        show: true,
        correct: data.correct,
        score: data.score,
        explanation: data.explanation || "",
      });

      setProgress(data);
      setAnswer("");
      setQuestionStartTime(null);
      if (timerInterval) {
        window.clearInterval(timerInterval);
        setTimerInterval(null);
      }
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
          time_ms: questionStartTime ? Date.now() - questionStartTime : 0,
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
      setQuestionStartTime(null);
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

  const fetchPerformance = async () => {
    if (!pdfId) return;
    setPerformanceLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5002/api/performance/${pdfId}`);
      const data = await res.json();
      setPerformanceData(data);
      setShowPerformanceModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPerformanceLoading(false);
    }
  };

  // UI for AI-generated tasks
  const renderTask = () => {
    if (!hurdle) return null;

    const task = hurdle.task;

    // Boss battles removed - no longer needed

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
    return (
      <div className="app-shell">
        <nav className="app-navbar">
          <div className="nav-left">
            <span className="brand-mark">HurdleSolver</span>
            <span className="brand-tag">PDF to Learning Adventures</span>
          </div>
          <div className="nav-actions">
            <button className="nav-btn" onClick={handleHomeUploadClick}>
              Upload PDF
            </button>
          </div>
        </nav>
        <div className="home-layout">
          <div className="home-visual">
            <HomeScreen3D onUploadClick={handleHomeUploadClick} />
          </div>
          <div className="home-panel">
            <div className="upload-card">
              <div className="upload-icon">📄</div>
              <h2>Transform PDFs into Interactive Learning</h2>
              <p>
                Upload a PDF to generate smart, niche-focused questions, track
                your performance, and visualize your progress—instantly.
              </p>
              <button
                className="primary-upload-btn"
                onClick={handleHomeUploadClick}
              >
                Choose your PDF
              </button>
              <div className="upload-hints">
                <span>✨ AI-powered insights</span>
                <span>🎯 Topic mastery tracking</span>
                <span>⏱️ Timing analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="app-navbar">
        <div className="nav-left">
          <span className="brand-mark" onClick={resetToHome}>
            HurdleSolver
          </span>
          <span className="brand-tag">Learn faster from any PDF</span>
        </div>
        <div className="nav-actions">
          <button className="nav-btn" onClick={resetToHome}>
            Home
          </button>
          <button
            className="nav-btn accent"
            onClick={() => {
              setPdfId(null);
              setHurdle(null);
              setProgress({ xp: 0, streak: 0, current: 0 });
              setFile(null);
              setDone(false);
              setFeedback(null);
              setShowHomeScreen(false);
            }}
          >
            Upload Another PDF
          </button>
          {pdfId && (
            <button
              className="nav-btn highlight"
              onClick={fetchPerformance}
              disabled={performanceLoading}
            >
              {performanceLoading ? "Loading..." : "View Performance"}
            </button>
          )}
        </div>
      </nav>
      {pdfId && numChunks > 0 && (
        <ProgressBar
          totalHurdles={numChunks}
          currentHurdle={progress.current}
          xp={progress.xp}
          streak={progress.streak}
        />
      )}
      {!pdfId && (
        <div className="upload-area">
          <div className="upload-card inline">
            <div className="upload-icon">📚</div>
            <h2>Ready to begin?</h2>
            <p>Select a PDF to generate questions and track your mastery.</p>
            <form onSubmit={handleUpload} className="upload-form">
              <label className="upload-dropzone">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
                <span>
                  {file ? file.name : "Drag & drop or click to select"}
                </span>
              </label>
              <button
                type="submit"
                disabled={loading || !file}
                className="primary-upload-btn"
              >
                {loading ? "Uploading..." : "Upload PDF"}
              </button>
            </form>
          </div>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading...</div>}

      {/* Feedback Modal for correct answers */}
      {feedback && feedback.show && feedback.correct && (
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

      {/* Inline feedback for incorrect answers */}
      {feedback && feedback.show && !feedback.correct && (
        <div className="inline-feedback incorrect">
          <span>❌ Incorrect. Moving to the next question.</span>
        </div>
      )}
      {pdfId && !done && (
        <div className="main-content">
          <div className="question-section">
            <div className="question-meta">
              <span className="timer">⏱️ Time: {timer}s</span>
              <span className="progress-indicator">
                Question {progress.current + 1} of {numChunks}
              </span>
            </div>
            {renderTask()}
          </div>

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
      {showPerformanceModal && performanceData && (
        <div className="performance-modal">
          <div className="performance-content">
            <div className="performance-header">
              <h3>📊 Topic Mastery Overview</h3>
              <button
                className="close-btn"
                onClick={() => setShowPerformanceModal(false)}
              >
                ✕
              </button>
            </div>
            {performanceData.topic_performance ? (
              <div className="performance-body">
                <div className="performance-summary">
                  <div>
                    <span className="summary-label">Total Attempts</span>
                    <span className="summary-value">
                      {performanceData.total_attempts}
                    </span>
                  </div>
                  <div>
                    <span className="summary-label">Best Topic</span>
                    <span className="summary-value">
                      {performanceData.best_topic}
                    </span>
                  </div>
                  <div>
                    <span className="summary-label">Needs Attention</span>
                    <span className="summary-value">
                      {performanceData.worst_topic}
                    </span>
                  </div>
                </div>
                <div className="topic-grid">
                  {Object.entries(performanceData.topic_performance).map(
                    ([topic, stats]: any) => (
                      <div key={topic} className="topic-card">
                        <h4>
                          {topic.charAt(0).toUpperCase() + topic.slice(1)}
                        </h4>
                        <div className="topic-metric">
                          <span>Accuracy</span>
                          <strong>{stats.accuracy.toFixed(1)}%</strong>
                        </div>
                        <div className="topic-metric">
                          <span>Avg Time</span>
                          <strong>{(stats.avg_time / 1000).toFixed(1)}s</strong>
                        </div>
                        <div className="topic-metric">
                          <span>Question Count</span>
                          <strong>{stats.total}</strong>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="performance-empty">
                <p>
                  No performance data yet. Answer some questions to see
                  insights!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
