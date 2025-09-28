import "./App.css";
import "./ProgressBar.css";

// Components
import ProgressBar from "./ProgressBar";
import HomeScreen3D from "./HomeScreen3D";
import { UploadSection } from "./components/upload/UploadSection";
import { QuestionCard } from "./components/game/QuestionCard";
import { DocumentQuery } from "./components/game/DocumentQuery";
import {
  FeedbackModal,
  InlineFeedback,
} from "./components/feedback/FeedbackModal";
import { PerformanceModal } from "./components/feedback/PerformanceModal";
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
    setProgress({ xp: 0, streak: 0, current: 0 });
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

  // Handle game completion
  const handleGameComplete = async (
    correct: boolean,
    score: number,
    userAnswer?: any
  ) => {
    if (!gameState.pdfId || !gameState.hurdle) return;

    setLoading(true);
    setError(null);

    // Calculate time taken
    const timeMs = gameState.questionStartTime
      ? Date.now() - gameState.questionStartTime
      : 0;

    try {
      const data = await ApiService.submitAnswer(gameState.pdfId, {
        answer: userAnswer,
        task_type: gameState.hurdle.task_type,
        correct,
        score,
        time_ms: timeMs,
      });

      if (!data.correct) {
        // Incorrect answer: show inline feedback and move to next question
        setFeedback({
          show: true,
          correct: false,
          score: data.score,
          explanation: "",
        });
        setProgress(data);
        stopTimer();
        fetchHurdle(gameState.pdfId);
        return;
      }

      // Correct answer: show modal feedback
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

  // Handle skip question
  const handleSkipQuestion = async () => {
    if (!gameState.pdfId || !gameState.hurdle) return;

    setLoading(true);
    setError(null);

    try {
      const timeMs = gameState.questionStartTime
        ? Date.now() - gameState.questionStartTime
        : 0;
      const data = await ApiService.skipQuestion(gameState.pdfId, timeMs);

      setFeedback({
        show: true,
        correct: false,
        score: 0,
        explanation: data.explanation || "Question skipped.",
      });

      setProgress(data);
      stopTimer();
      fetchHurdle(gameState.pdfId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Continue to next hurdle after viewing feedback
  const continueToNext = () => {
    setFeedback(null);
    if (gameState.pdfId) {
      fetchHurdle(gameState.pdfId);
    }
  };

  // Show performance analysis
  const showPerformanceAnalysis = async () => {
    if (!gameState.pdfId) return;

    setShowPerformanceModal(true);
    setPerformanceLoading(true);

    try {
      const data = await ApiService.getPerformance(gameState.pdfId);
      setPerformanceData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPerformanceLoading(false);
    }
  };

  // Handle question submission
  const handleQuestionSubmit = (answer: any) => {
    if (!gameState.hurdle) return;

    if (gameState.hurdle.task.type === "choice") {
      const isCorrect = answer === gameState.hurdle.task.correct;
      const score = isCorrect ? 100 : 0;
      handleGameComplete(isCorrect, score, answer);
    } else if (gameState.hurdle.task.type === "cloze") {
      // For cloze questions, we'll assume correct for now
      // In a real implementation, you'd validate against expected answers
      handleGameComplete(true, 100, answer);
    }
  };

  return (
    <div className="App">
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
          <ProgressBar
            xp={gameState.progress.xp}
            streak={gameState.progress.streak}
            currentHurdle={gameState.progress.current}
            totalHurdles={gameState.numChunks}
          />

          <div className="main-content">
            <div className="question-section">
              {gameState.hurdle && (
                <QuestionCard
                  task={gameState.hurdle.task}
                  timer={gameState.timer}
                  progress={gameState.progress}
                  numChunks={gameState.numChunks}
                  onSubmit={handleQuestionSubmit}
                  onSkip={handleSkipQuestion}
                  loading={uiState.loading}
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
          onShowPerformance={showPerformanceAnalysis}
          onRestart={resetToHome}
        />
      )}

      {/* Feedback Components */}
      {uiState.feedback && (
        <>
          <FeedbackModal
            feedback={uiState.feedback}
            onContinue={continueToNext}
          />
          <InlineFeedback feedback={uiState.feedback} />
        </>
      )}

      {/* Performance Modal */}
      <PerformanceModal
        show={uiState.showPerformanceModal}
        performanceData={uiState.performanceData}
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
