import { useState } from "react";
import "./App.css";

// Components
import { StoryProgress } from "./components/progress/StoryProgress";
import { BuckeyeAvatar } from "./components/avatar/BuckeyeAvatar";
import HomeScreen3D from "./HomeScreen3D";
import { UploadSection } from "./components/upload/UploadSection";
import { QuestionCard } from "./components/game/QuestionCard";
import { DocumentQuery } from "./components/game/DocumentQuery";
import { ImprovementModal } from "./components/feedback/ImprovementModal";
import { ErrorMessage } from "./components/common/ErrorMessage";
import { LoadingSpinner } from "./components/common/LoadingSpinner";
import { CompletionScreen } from "./components/common/CompletionScreen";

// Hooks
import { useGameState } from "./hooks/useGameState";
import { useUIState } from "./hooks/useUIState";
import { useQuery } from "./hooks/useQuery";

// Services
import { ApiService } from "./services/api";

function App() {
  const {
    gameState,
    setPdfId,
    setNumChunks,
    setHurdle,
    setProgress,
    setDone,
    resetGame,
    startTimer,
    stopTimer,
  } = useGameState();

  const {
    uiState,
    setLoading,
    setError,
    setShowHomeScreen,
    setFeedback,
    setShowPerformanceModal,
    setPerformanceData,
    setPerformanceLoading,
    resetUI,
  } = useUIState();

  const { queryState, setQuery, submitQuery, resetQuery } = useQuery();

  // Local feedback state for inline display
  const [inlineFeedback, setInlineFeedback] = useState<{
    correct: boolean;
    explanation: string;
    hint?: string;
  } | null>(null);

  // Handle home screen upload click
  const handleHomeUploadClick = () => {
    setShowHomeScreen(false);
  };

  // Reset to home screen
  const resetToHome = () => {
    resetGame();
    resetUI();
    resetQuery();
  };

  // Handle PDF upload success
  const handleUploadSuccess = async (pdfId: string, numChunks: number) => {
    setPdfId(pdfId);
    setNumChunks(numChunks);
    setProgress({ current: 0 });
    setDone(false);
    await fetchHurdle(pdfId);
  };

  // Fetch next hurdle
  const fetchHurdle = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await ApiService.fetchHurdle(id);
      if (data.done) {
        setDone(true);
        setHurdle(null);
        stopTimer();
        return;
      }
      setHurdle(data);
      startTimer();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch next hurdle using current PDF ID
  const fetchNextHurdle = async () => {
    if (gameState.pdfId) {
      await fetchHurdle(gameState.pdfId);
    }
  };

  // Handle game completion
  const handleGameComplete = async (userAnswer?: any) => {
    if (!gameState.pdfId || !gameState.hurdle) return;

    setLoading(true);
    setError(null);

    // Calculate time taken
    const timeMs = gameState.questionStartTime
      ? Date.now() - gameState.questionStartTime
      : 0;

    try {
      const data = await ApiService.submitAnswer(
        gameState.pdfId,
        userAnswer,
        timeMs,
        false
      );

      // Set inline feedback for both correct and incorrect answers
      setInlineFeedback({
        correct: data.correct,
        explanation: data.explanation,
        hint: data.hint,
      });

      // Update progress
      setProgress({
        current: data.new_progress,
      });

      if (!data.correct) {
        // Incorrect answer: stay on same question, show feedback
        stopTimer();
        // Clear feedback after 5 seconds for incorrect answers
        setTimeout(() => {
          setInlineFeedback(null);
          startTimer(); // Restart timer for retry
        }, 5000);
        return;
      }

      // Correct answer: proceed to next question after brief feedback
      stopTimer();
      setTimeout(async () => {
        setInlineFeedback(null);
        await fetchNextHurdle();
      }, 2000);

      // Legacy feedback for modal (keeping for compatibility)
      setFeedback({
        show: true,
        correct: data.correct,
        score: data.score,
        explanation: data.explanation || "",
      });

      setProgress(data);
      stopTimer();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show completion message
  const showCompletionMessage = async () => {
    if (!gameState.pdfId) return;

    setShowPerformanceModal(true);
    setPerformanceLoading(true);

    try {
      const data = await ApiService.getCompletionMessage(gameState.pdfId);
      setPerformanceData(data); // Store the full response with message and stats
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPerformanceLoading(false);
    }
  };

  // Handle question submission
  const handleQuestionSubmit = (answer: any) => {
    if (!gameState.hurdle) return;

    handleGameComplete(answer);
  };

  // Handle question skip
  const handleSkipQuestion = async () => {
    if (!gameState.pdfId || !gameState.hurdle) return;

    setLoading(true);
    setError(null);

    // Calculate time taken
    const timeMs = gameState.questionStartTime
      ? Date.now() - gameState.questionStartTime
      : 0;

    try {
      const data = await ApiService.submitAnswer(
        gameState.pdfId,
        null,
        timeMs,
        true // is_skip = true
      );

      // Update progress
      setProgress({
        current: data.new_progress || data.current,
      });

      // Move to next question
      stopTimer();
      await fetchNextHurdle();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Navbar with Buckeye Avatar */}
      <nav className="app-navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <BuckeyeAvatar size="small" mood="happy" animate={true} />
            <span>Hurdle Solver</span>
          </div>
          <div className="navbar-actions">
            <button
              className="navbar-btn"
              onClick={resetToHome}
              title="Go Home"
            >
              🏠 Home
            </button>
          </div>
        </div>
      </nav>

      <ErrorMessage error={uiState.error} onDismiss={() => setError(null)} />

      {uiState.showHomeScreen ? (
        <HomeScreen3D onUploadClick={handleHomeUploadClick} />
      ) : null}

      {!uiState.showHomeScreen && !gameState.pdfId && (
        <UploadSection
          onUploadSuccess={handleUploadSuccess}
          onError={setError}
          loading={uiState.loading}
          setLoading={setLoading}
        />
      )}

      {gameState.pdfId && !gameState.done && (
        <>
          <StoryProgress
            totalHurdles={gameState.numChunks}
            currentHurdle={gameState.progress.current}
            completedHurdles={gameState.progress.current}
            onNodeClick={(nodeId) => {
              // Handle node click - could navigate to specific hurdle
              console.log(`Clicked node ${nodeId}`);
            }}
          />

          <div className="main-content">
            <div className="question-section">
              {gameState.hurdle && (
                <QuestionCard
                  task={gameState.hurdle.task}
                  timer={gameState.timer}
                  progress={gameState.progress}
                  numChunks={gameState.numChunks}
                  questionProgress={gameState.hurdle.question_progress}
                  onSubmit={handleQuestionSubmit}
                  onSkip={handleSkipQuestion}
                  loading={uiState.loading}
                  feedback={inlineFeedback}
                />
              )}
            </div>

            <DocumentQuery
              pdfId={gameState.pdfId}
              documentTitle={gameState.hurdle?.document_title}
              queryState={queryState}
              onQueryChange={setQuery}
              onSubmitQuery={submitQuery}
            />
          </div>
        </>
      )}

      {gameState.done && (
        <CompletionScreen
          progress={gameState.progress}
          onShowImprovements={showCompletionMessage}
          onRestart={resetToHome}
        />
      )}

      {/* Feedback Components - Now handled inline in QuestionCard */}

      {/* Completion Summary Modal */}
      <ImprovementModal
        show={uiState.showPerformanceModal}
        message={
          uiState.performanceData &&
          typeof uiState.performanceData === "object" &&
          "message" in uiState.performanceData
            ? uiState.performanceData.message
            : typeof uiState.performanceData === "string"
            ? uiState.performanceData
            : null
        }
        stats={
          uiState.performanceData &&
          typeof uiState.performanceData === "object" &&
          "stats" in uiState.performanceData
            ? uiState.performanceData.stats
            : null
        }
        loading={uiState.performanceLoading}
        onClose={() => setShowPerformanceModal(false)}
        onRestart={resetToHome}
      />

      {/* Global Loading */}
      {uiState.loading && !gameState.hurdle && (
        <LoadingSpinner message="Processing your request..." />
      )}
    </div>
  );
}

export default App;
