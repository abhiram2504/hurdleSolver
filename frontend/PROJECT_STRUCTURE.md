# Project Structure

This document outlines the refactored frontend structure for better maintainability and scalability.

## 📁 Folder Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Common/shared components
│   │   ├── ErrorMessage.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── CompletionScreen.tsx
│   ├── upload/          # Upload-related components
│   │   └── UploadSection.tsx
│   ├── game/            # Game/learning components
│   │   ├── QuestionCard.tsx
│   │   └── DocumentQuery.tsx
│   ├── feedback/        # Feedback and performance components
│   │   ├── FeedbackModal.tsx
│   │   └── PerformanceModal.tsx
│   └── index.ts         # Component exports
├── hooks/               # Custom React hooks
│   ├── useGameState.ts  # Game state management
│   ├── useUIState.ts    # UI state management
│   ├── useQuery.ts      # Document query functionality
│   └── index.ts         # Hook exports
├── services/            # API and external services
│   └── api.ts           # API service functions
├── types/               # TypeScript type definitions
│   └── index.ts         # Type exports
├── utils/               # Utility functions (future use)
├── App.tsx              # Main application component
├── App.css              # Global styles
└── main.tsx             # Application entry point
```

## 🧩 Component Architecture

### **Common Components**
- `ErrorMessage`: Displays error messages with optional dismiss functionality
- `LoadingSpinner`: Reusable loading indicator with customizable size and message
- `CompletionScreen`: Shows completion stats and actions when learning is finished

### **Upload Components**
- `UploadSection`: Handles PDF file upload with drag-and-drop support and visual feedback

### **Game Components**
- `QuestionCard`: Renders different question types (multiple choice, fill-in-blank) with timer and actions
- `DocumentQuery`: Provides document querying interface with AI-powered responses

### **Feedback Components**
- `FeedbackModal`: Shows detailed feedback for correct answers with explanations
- `InlineFeedback`: Shows brief feedback for incorrect answers
- `PerformanceModal`: Displays comprehensive performance analytics

## 🎣 Custom Hooks

### **useGameState**
Manages all game-related state:
- PDF ID and document info
- Current hurdle and progress
- Timer functionality
- Game completion status

### **useUIState**
Manages UI-related state:
- Loading states
- Error handling
- Modal visibility
- Performance data

### **useQuery**
Manages document querying:
- Query input and response
- Loading states
- API communication

## 🔧 Services

### **ApiService**
Centralized API communication:
- `uploadPdf()` - Upload PDF files
- `fetchHurdle()` - Get next question
- `submitAnswer()` - Submit answers
- `skipQuestion()` - Skip questions
- `queryDocument()` - Query document content
- `getPerformance()` - Get performance analytics
- `getDownloadUrl()` - Get PDF download URL

## 📝 Type Definitions

All TypeScript interfaces are centralized in `types/index.ts`:
- `Task`, `Hurdle`, `Progress` - Core game types
- `Feedback`, `PerformanceData` - Feedback types
- `GameState`, `UIState`, `QueryState` - State management types

## 🎯 Benefits of This Structure

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components can be easily reused across the application
3. **Maintainability**: Code is organized and easy to find/modify
4. **Type Safety**: Centralized type definitions ensure consistency
5. **Testability**: Isolated components and hooks are easier to test
6. **Scalability**: New features can be added without affecting existing code

## 🚀 Usage Examples

### Using Components
```tsx
import { QuestionCard, ErrorMessage } from './components';
import { useGameState } from './hooks';

function MyComponent() {
  const { gameState } = useGameState();
  
  return (
    <div>
      <ErrorMessage error="Something went wrong" />
      <QuestionCard task={gameState.hurdle?.task} />
    </div>
  );
}
```

### Using Hooks
```tsx
import { useGameState, useUIState } from './hooks';

function MyComponent() {
  const { gameState, setProgress } = useGameState();
  const { uiState, setLoading } = useUIState();
  
  // Use state and actions...
}
```

### Using Services
```tsx
import { ApiService } from './services/api';

async function uploadFile(file: File) {
  try {
    const result = await ApiService.uploadPdf(file);
    console.log('Upload successful:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

## 🔄 Migration Notes

The refactoring maintains all existing functionality while improving:
- Code organization and readability
- Type safety and error handling
- Component reusability
- State management clarity
- API communication consistency

All original features remain intact:
- PDF upload and processing
- Interactive questions with timer
- Document querying with AI
- Performance analytics
- Progress tracking
- Feedback systems
