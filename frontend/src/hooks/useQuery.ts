import { useState, useCallback } from 'react';
import type { QueryState } from '../types';
import { ApiService } from '../services/api';

export const useQuery = () => {
  const [queryState, setQueryState] = useState<QueryState>({
    query: '',
    queryResponse: '',
    queryLoading: false,
  });

  const setQuery = useCallback((query: string) => {
    setQueryState(prev => ({ ...prev, query }));
  }, []);

  const setQueryResponse = useCallback((queryResponse: string) => {
    setQueryState(prev => ({ ...prev, queryResponse }));
  }, []);

  const setQueryLoading = useCallback((queryLoading: boolean) => {
    setQueryState(prev => ({ ...prev, queryLoading }));
  }, []);

  const submitQuery = useCallback(async (pdfId: string, query: string) => {
    if (!query.trim() || !pdfId) return;
    
    setQueryLoading(true);
    try {
      const data = await ApiService.queryDocument(pdfId, query);
      // Handle enhanced response format
      if (data.answer) {
        let response = data.answer;
        
        // Add metadata if available
        if (data.confidence && data.source_chunks) {
          const confidenceEmoji = data.confidence === 'high' ? '🎯' : data.confidence === 'medium' ? '📊' : '💭';
          response += `\n\n${confidenceEmoji} Based on ${data.source_chunks} relevant section${data.source_chunks !== 1 ? 's' : ''} from the document.`;
        }
        
        setQueryResponse(response);
      } else {
        setQueryResponse(data.answer || "No response received.");
      }
    } catch (err: any) {
      setQueryResponse(`Error: ${err.message}`);
    } finally {
      setQueryLoading(false);
    }
  }, []);

  const resetQuery = useCallback(() => {
    setQueryState({
      query: '',
      queryResponse: '',
      queryLoading: false,
    });
  }, []);

  return {
    queryState,
    setQuery,
    setQueryResponse,
    setQueryLoading,
    submitQuery,
    resetQuery,
  };
};
