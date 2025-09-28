import React, { useState } from "react";
import { ApiService } from "../../services/api";
import "./UploadSection.css";

interface UploadSectionProps {
  onUploadSuccess: (pdfId: string, numChunks: number) => void;
  onError: (error: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onUploadSuccess,
  onError,
  loading,
  setLoading,
}) => {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    onError("");

    try {
      const data = await ApiService.uploadPdf(file);
      onUploadSuccess(data.pdf_id, data.num_chunks);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-section">
      <div className="upload-container">
        <div className="upload-header">
          <h2>📚 Upload Your PDF</h2>
          <p>Transform your document into an interactive learning experience</p>
        </div>

        <form onSubmit={handleUpload} className="upload-form">
          <div className="file-input-container">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="file-input"
              id="pdf-upload"
              disabled={loading}
            />
            <label htmlFor="pdf-upload" className="file-input-label">
              {file ? (
                <>
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file.name}</span>
                </>
              ) : (
                <>
                  <span className="upload-icon">📤</span>
                  <span>Choose PDF file or drag & drop</span>
                </>
              )}
            </label>
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="upload-btn"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>
                <span>🚀</span>
                Start Learning
              </>
            )}
          </button>
        </form>

        <div className="upload-info">
          <div className="info-item">
            <span className="info-icon">⚡</span>
            <span>AI-powered questions</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📊</span>
            <span>Progress tracking</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🎯</span>
            <span>Personalized learning</span>
          </div>
        </div>
      </div>
    </div>
  );
};
