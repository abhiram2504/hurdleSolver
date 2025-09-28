import { useState, useCallback } from 'react';
import type { GameState, Progress, Hurdle } from '../types';

const initialProgress: Progress = {
  current: 0,
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>({
    pdfId: null,
    numChunks: 0,
    hurdle: null,
    progress: initialProgress,
    done: false,
    timer: 0,
    timerInterval: null,
    questionStartTime: null,
  });

  const setPdfId = useCallback((pdfId: string | null) => {
    setGameState(prev => ({ ...prev, pdfId }));
  }, []);

  const setNumChunks = useCallback((numChunks: number) => {
    setGameState(prev => ({ ...prev, numChunks }));
  }, []);

  const setHurdle = useCallback((hurdle: Hurdle | null) => {
    setGameState(prev => ({ ...prev, hurdle }));
  }, []);

  const setProgress = useCallback((progress: Progress) => {
    setGameState(prev => ({ ...prev, progress }));
  }, []);

  const setDone = useCallback((done: boolean) => {
    setGameState(prev => ({ ...prev, done }));
  }, []);

  const setTimer = useCallback((timer: number) => {
    setGameState(prev => ({ ...prev, timer }));
  }, []);

  const setTimerInterval = useCallback((timerInterval: number | null) => {
    setGameState(prev => ({ ...prev, timerInterval }));
  }, []);

  const setQuestionStartTime = useCallback((questionStartTime: number | null) => {
    setGameState(prev => ({ ...prev, questionStartTime }));
  }, []);

  const resetGame = useCallback(() => {
    if (gameState.timerInterval) {
      window.clearInterval(gameState.timerInterval);
    }
    setGameState({
      pdfId: null,
      numChunks: 0,
      hurdle: null,
      progress: initialProgress,
      done: false,
      timer: 0,
      timerInterval: null,
      questionStartTime: null,
    });
  }, [gameState.timerInterval]);

  const startTimer = useCallback(() => {
    if (gameState.timerInterval) {
      window.clearInterval(gameState.timerInterval);
    }
    
    const intervalId = window.setInterval(() => {
      setGameState(prev => ({ ...prev, timer: prev.timer + 1 }));
    }, 1000);
    
    setTimerInterval(intervalId);
    setTimer(0);
    setQuestionStartTime(Date.now());
  }, [gameState.timerInterval]);

  const stopTimer = useCallback(() => {
    if (gameState.timerInterval) {
      window.clearInterval(gameState.timerInterval);
      setTimerInterval(null);
    }
  }, [gameState.timerInterval]);

  return {
    gameState,
    setPdfId,
    setNumChunks,
    setHurdle,
    setProgress,
    setDone,
    setTimer,
    setTimerInterval,
    setQuestionStartTime,
    resetGame,
    startTimer,
    stopTimer,
  };
};
