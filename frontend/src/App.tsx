import { useState } from "react";
import "./App.css";
import Roadmap3D from "./Roadmap3D";

interface Hurdle {
  chunk: string;
  task_type: string;
  is_boss: boolean;
  idx: number;
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
        body: JSON.stringify({ correct: true }),
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

  // UI for micro-task (MVP: just a text input)
  const renderTask = () => {
    if (!hurdle) return null;
    if (hurdle.is_boss) {
      return (
        <div className="boss-battle">
          <h2>Boss Battle!</h2>
          <p>{hurdle.chunk}</p>
          <input
            type="text"
            placeholder="Type your answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={loading}
          />
          <button onClick={handleSubmit} disabled={loading || !answer}>
            Submit
          </button>
        </div>
      );
    }
    // Micro-task types (MVP: all as text input)
    return (
      <div className="hurdle-task">
        <h3>Task: {hurdle.task_type}</h3>
        <p>{hurdle.chunk}</p>
        <input
          type="text"
          placeholder="Type your answer..."
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
      {pdfId && !done && (
        <div className="hurdle-section">
          <div className="progress-bar">
            <div
              className="progress"
              style={{ width: `${(progress.current / numChunks) * 100 || 0}%` }}
            />
          </div>
          <div className="stats">
            <span>XP: {progress.xp}</span>
            <span>Streak: {progress.streak}</span>
            <span>
              Hurdle: {progress.current + 1} / {numChunks}
            </span>
          </div>
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
