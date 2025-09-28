import { useState, useCallback } from 'react';
import type { UIState, Feedback, PerformanceData } from '../types';

export const useUIState = () => {
  const [uiState, setUIState] = useState<UIState>({
    loading: false,
    error: null,
    showHomeScreen: true,
    feedback: null,
    showPerformanceModal: false,
    performanceData: null,
    performanceLoading: false,
  });

  const setLoading = useCallback((loading: boolean) => {
    setUIState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setUIState(prev => ({ ...prev, error }));
  }, []);

  const setShowHomeScreen = useCallback((showHomeScreen: boolean) => {
    setUIState(prev => ({ ...prev, showHomeScreen }));
  }, []);

  const setFeedback = useCallback((feedback: Feedback | null) => {
    setUIState(prev => ({ ...prev, feedback }));
  }, []);

  const setShowPerformanceModal = useCallback((showPerformanceModal: boolean) => {
    setUIState(prev => ({ ...prev, showPerformanceModal }));
  }, []);

  const setPerformanceData = useCallback((performanceData: PerformanceData | null) => {
    setUIState(prev => ({ ...prev, performanceData }));
  }, []);

  const setPerformanceLoading = useCallback((performanceLoading: boolean) => {
    setUIState(prev => ({ ...prev, performanceLoading }));
  }, []);

  const resetUI = useCallback(() => {
    setUIState({
      loading: false,
      error: null,
      showHomeScreen: true,
      feedback: null,
      showPerformanceModal: false,
      performanceData: null,
      performanceLoading: false,
    });
  }, []);

  return {
    uiState,
    setLoading,
    setError,
    setShowHomeScreen,
    setFeedback,
    setShowPerformanceModal,
    setPerformanceData,
    setPerformanceLoading,
    resetUI,
  };
};
