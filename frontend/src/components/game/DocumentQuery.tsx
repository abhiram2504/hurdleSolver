import React from "react";
import type { QueryState } from "../../types";
import "./DocumentQuery.css";

interface DocumentQueryProps {
  pdfId: string;
  documentTitle?: string;
  queryState: QueryState;
  onQueryChange: (query: string) => void;
  onSubmitQuery: (pdfId: string, query: string) => void;
}

export const DocumentQuery: React.FC<DocumentQueryProps> = ({
  pdfId,
  documentTitle,
  queryState,
  onQueryChange,
  onSubmitQuery,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitQuery(pdfId, queryState.query);
  };

  return (
    <div className="document-query">
      <div className="document-header">
        <h3>📄 {documentTitle || "Document"}</h3>
      </div>

      <div className="query-section">
        <h4>🤖 AI Document Assistant</h4>
        <p className="query-description">
          Ask me anything about this document and I'll provide detailed answers
          based on the content.
        </p>
        <form onSubmit={handleSubmit} className="query-form">
          <textarea
            value={queryState.query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Examples: 'What are the main topics?', 'Summarize the key points', 'What does it say about...?'"
            className="query-input"
            rows={4}
            disabled={queryState.queryLoading}
          />
          <button
            type="submit"
            className="query-btn"
            disabled={queryState.queryLoading || !queryState.query.trim()}
          >
            {queryState.queryLoading ? "🧠 Analyzing..." : "🚀 Get Answer"}
          </button>
        </form>

        {queryState.queryResponse && (
          <div className="query-response">
            <h5>💡 Answer:</h5>
            <p>{queryState.queryResponse}</p>
          </div>
        )}
      </div>
    </div>
  );
};
