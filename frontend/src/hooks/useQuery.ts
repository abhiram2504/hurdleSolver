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
      setQueryResponse(data.answer);
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
