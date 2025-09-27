import React, { useState, useEffect } from "react";

interface GameProps {
  task: any;
  onComplete: (correct: boolean, score: number) => void;
}

// Drag and Drop Matching Game
export const MatchingGame: React.FC<GameProps> = ({ task, onComplete }) => {
  const [matches, setMatches] = useState<{ [key: string]: string }>({});
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const concepts = task.concepts || [];
  const definitions = task.definitions || [];

  const handleDragStart = (e: React.DragEvent, concept: string) => {
    setDraggedItem(concept);
  };

  const handleDrop = (e: React.DragEvent, definition: string) => {
    e.preventDefault();
    if (draggedItem) {
      setMatches({ ...matches, [draggedItem]: definition });
      setDraggedItem(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const checkAnswers = () => {
    let correctCount = 0;
    concepts.forEach((concept: any) => {
      if (matches[concept.term] === concept.definition) {
        correctCount++;
      }
    });
    const scorePercent = (correctCount / concepts.length) * 100;
    setScore(scorePercent);
    onComplete(scorePercent >= 70, scorePercent, matches);
  };

  return (
    <div className="matching-game">
      <h3>🎯 Match the Concepts!</h3>
      <p>Drag concepts to their correct definitions</p>

      <div className="game-board">
        <div className="concepts-column">
          <h4>Concepts</h4>
          {concepts.map((concept: any, idx: number) => (
            <div
              key={idx}
              className="concept-card"
              draggable
              onDragStart={(e) => handleDragStart(e, concept.term)}
            >
              {concept.term}
            </div>
          ))}
        </div>

        <div className="definitions-column">
          <h4>Definitions</h4>
          {definitions.map((definition: string, idx: number) => (
            <div
              key={idx}
              className="definition-card"
              onDrop={(e) => handleDrop(e, definition)}
              onDragOver={handleDragOver}
            >
              {definition}
              {Object.values(matches).includes(definition) && (
                <div className="matched-concept">
                  {Object.keys(matches).find(
                    (key) => matches[key] === definition
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={checkAnswers}
        disabled={Object.keys(matches).length < concepts.length}
      >
        Check Matches
      </button>

      {score > 0 && <div className="score">Score: {score.toFixed(0)}%</div>}
    </div>
  );
};

// Memory Card Game
export const MemoryGame: React.FC<GameProps> = ({ task, onComplete }) => {
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);

  const cards = task.memory_pairs || [];
  const gameCards = [
    ...cards.map((item: any, idx: number) => ({
      ...item,
      id: idx * 2,
      type: "term",
    })),
    ...cards.map((item: any, idx: number) => ({
      ...item,
      id: idx * 2 + 1,
      type: "definition",
    })),
  ].sort(() => Math.random() - 0.5);

  const handleCardClick = (cardId: number) => {
    if (
      flippedCards.length === 2 ||
      flippedCards.includes(cardId) ||
      matchedPairs.includes(cardId)
    ) {
      return;
    }

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setAttempts(attempts + 1);
      const [first, second] = newFlipped;
      const firstCard = gameCards.find((c) => c.id === first);
      const secondCard = gameCards.find((c) => c.id === second);

      if (
        firstCard &&
        secondCard &&
        Math.floor(firstCard.id / 2) === Math.floor(secondCard.id / 2) &&
        firstCard.type !== secondCard.type
      ) {
        // Match found
        setTimeout(() => {
          setMatchedPairs([...matchedPairs, first, second]);
          setFlippedCards([]);
        }, 1000);
      } else {
        // No match
        setTimeout(() => {
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  useEffect(() => {
    if (matchedPairs.length === gameCards.length) {
      const score = Math.max(0, 100 - attempts * 5);
      onComplete(true, score);
    }
  }, [matchedPairs, attempts, gameCards.length, onComplete]);

  return (
    <div className="memory-game">
      <h3>🧠 Memory Match Game</h3>
      <p>Find matching pairs of concepts and definitions</p>
      <div className="attempts">Attempts: {attempts}</div>

      <div className="cards-grid">
        {gameCards.map((card) => (
          <div
            key={card.id}
            className={`memory-card ${
              flippedCards.includes(card.id) || matchedPairs.includes(card.id)
                ? "flipped"
                : ""
            }`}
            onClick={() => handleCardClick(card.id)}
          >
            <div className="card-front">?</div>
            <div className="card-back">
              {card.type === "term" ? card.term : card.definition}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Speed Typing Game
export const TypingGame: React.FC<GameProps> = ({ task, onComplete }) => {
  const [currentText, setCurrentText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const targetText =
    task.typing_text || "Type this important concept from your PDF!";

  useEffect(() => {
    if (userInput.length === 1 && !startTime) {
      setStartTime(Date.now());
    }

    if (userInput === targetText) {
      const endTime = Date.now();
      const timeInMinutes = (endTime - (startTime || endTime)) / 1000 / 60;
      const wordsTyped = targetText.split(" ").length;
      const calculatedWpm = Math.round(wordsTyped / timeInMinutes);
      setWpm(calculatedWpm);

      const score = Math.min(100, calculatedWpm * 2);
      onComplete(true, score);
    }

    // Calculate accuracy
    let correct = 0;
    for (let i = 0; i < Math.min(userInput.length, targetText.length); i++) {
      if (userInput[i] === targetText[i]) correct++;
    }
    const acc = userInput.length > 0 ? (correct / userInput.length) * 100 : 100;
    setAccuracy(Math.round(acc));
  }, [userInput, targetText, startTime, onComplete]);

  return (
    <div className="typing-game">
      <h3>⚡ Speed Typing Challenge</h3>
      <p>Type the following text as fast and accurately as possible:</p>

      <div className="target-text">
        {targetText.split("").map((char, idx) => (
          <span
            key={idx}
            className={
              idx < userInput.length
                ? userInput[idx] === char
                  ? "correct"
                  : "incorrect"
                : idx === userInput.length
                ? "current"
                : ""
            }
          >
            {char}
          </span>
        ))}
      </div>

      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Start typing here..."
        className="typing-input"
      />

      <div className="typing-stats">
        <span>WPM: {wpm}</span>
        <span>Accuracy: {accuracy}%</span>
      </div>
    </div>
  );
};

// Interactive Highlighting Game
export const HighlightGame: React.FC<GameProps> = ({ task, onComplete }) => {
  const [selectedText, setSelectedText] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  const text = task.text || "";
  const targetPhrases = task.target_phrases || [];
  const words = text.split(" ");

  const handleWordClick = (wordIndex: number) => {
    const word = words[wordIndex];
    if (selectedText.includes(word)) {
      setSelectedText(selectedText.filter((w) => w !== word));
    } else {
      setSelectedText([...selectedText, word]);
    }
  };

  const checkHighlights = () => {
    let correctHighlights = 0;
    targetPhrases.forEach((phrase: string) => {
      if (selectedText.join(" ").includes(phrase)) {
        correctHighlights++;
      }
    });

    const calculatedScore = (correctHighlights / targetPhrases.length) * 100;
    setScore(calculatedScore);
    onComplete(calculatedScore >= 70, calculatedScore);
  };

  return (
    <div className="highlight-game">
      <h3>🔍 Interactive Highlighting</h3>
      <p>Click on words to highlight the key concepts!</p>

      <div className="text-to-highlight">
        {words.map((word, idx) => (
          <span
            key={idx}
            className={`word ${
              selectedText.includes(word) ? "highlighted" : ""
            }`}
            onClick={() => handleWordClick(idx)}
          >
            {word}{" "}
          </span>
        ))}
      </div>

      <div className="target-hints">
        <h4>Find these concepts:</h4>
        {targetPhrases.map((phrase: string, idx: number) => (
          <span key={idx} className="hint-phrase">
            {phrase}
          </span>
        ))}
      </div>

      <button onClick={checkHighlights}>Check Highlights</button>

      {score > 0 && <div className="score">Score: {score.toFixed(0)}%</div>}
    </div>
  );
};
