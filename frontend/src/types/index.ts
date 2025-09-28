// Core application types

export interface Task {
  type: string;
  question?: string;
  options?: string[];
  correct?: number;
  explanation?: string;
  questions?: Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
  title?: string;
  difficulty?: number;
}

export interface Hurdle {
  chunk: string;
  task: Task;
  task_type: string;
  is_boss: boolean;
  idx: number;
  difficulty?: number;
  key_concepts?: string[];
  document_text?: string;
  document_title?: string;
}

export interface Progress {
  xp: number;
  streak: number;
  current: number;
}

export interface Feedback {
  show: boolean;
  correct: boolean;
  score: number;
  explanation: string;
}

export interface PerformanceData {
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  average_time: number;
  topics: Array<{
    topic: string;
    accuracy: number;
    avg_time: number;
    questions_count: number;
  }>;
}

export interface GameState {
  pdfId: string | null;
  numChunks: number;
  hurdle: Hurdle | null;
  progress: Progress;
  done: boolean;
  timer: number;
  timerInterval: number | null;
  questionStartTime: number | null;
}

export interface UIState {
  loading: boolean;
  error: string | null;
  showHomeScreen: boolean;
  feedback: Feedback | null;
  showPerformanceModal: boolean;
  performanceData: PerformanceData | null;
  performanceLoading: boolean;
}

export interface QueryState {
  query: string;
  queryResponse: string;
  queryLoading: boolean;
}
