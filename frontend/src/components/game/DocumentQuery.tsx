import React from "react";
import type { QueryState } from "../../types";
import { ApiService } from "../../services/api";
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
        <a
          href={ApiService.getDownloadUrl(pdfId)}
          className="download-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          📥 Download PDF
        </a>
      </div>

      <div className="query-section">
        <h4>💬 Ask about the document</h4>
        <form onSubmit={handleSubmit} className="query-form">
          <textarea
            value={queryState.query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Ask a question about the document content..."
            className="query-input"
            rows={3}
            disabled={queryState.queryLoading}
          />
          <button
            type="submit"
            className="query-btn"
            disabled={queryState.queryLoading || !queryState.query.trim()}
          >
            {queryState.queryLoading ? "🤔 Thinking..." : "🔍 Ask"}
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
