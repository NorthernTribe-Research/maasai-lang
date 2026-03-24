import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { playCorrectSound, playIncorrectSound, playTapSound } from "@/lib/sounds";

interface MatchingPair {
  left: string;
  right: string;
}

interface MatchingPairsExerciseProps {
  question: string;
  pairs: MatchingPair[];
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
}

export function MatchingPairsExercise({
  question,
  pairs,
  onAnswer,
}: MatchingPairsExerciseProps) {
  // Shuffle the right column independently
  const [shuffledRight] = useState(() =>
    [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5)
  );

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ left: number; right: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const isComplete = matchedPairs.size === pairs.length;
  const leftItems = pairs.map((p) => p.left);

  const checkMatch = useCallback(
    (leftIdx: number, rightIdx: number) => {
      const leftWord = leftItems[leftIdx];
      const rightWord = shuffledRight[rightIdx];

      // Check if the pair matches
      const correctPair = pairs.find((p) => p.left === leftWord);
      if (correctPair && correctPair.right === rightWord) {
        // Match!
        playCorrectSound();
        const newMatched = new Set(matchedPairs);
        newMatched.add(leftWord);
        setMatchedPairs(newMatched);
        setSelectedLeft(null);
        setSelectedRight(null);

        // Check if all matched
        if (newMatched.size === pairs.length) {
          const allCorrect = mistakes === 0;
          onAnswer(allCorrect, `${newMatched.size}/${pairs.length} matched, ${mistakes} mistakes`);
        }
      } else {
        // Wrong match
        playIncorrectSound();
        setMistakes((m) => m + 1);
        setWrongPair({ left: leftIdx, right: rightIdx });

        setTimeout(() => {
          setWrongPair(null);
          setSelectedLeft(null);
          setSelectedRight(null);
        }, 600);
      }
    },
    [leftItems, shuffledRight, pairs, matchedPairs, mistakes, onAnswer]
  );

  const handleLeftClick = (index: number) => {
    if (matchedPairs.has(leftItems[index]) || wrongPair) return;
    playTapSound();
    setSelectedLeft(index);
    if (selectedRight !== null) {
      checkMatch(index, selectedRight);
    }
  };

  const handleRightClick = (index: number) => {
    // Check if this right item is already matched
    const rightWord = shuffledRight[index];
    const isMatched = Array.from(matchedPairs).some(
      (leftWord) => pairs.find((p) => p.left === leftWord)?.right === rightWord
    );
    if (isMatched || wrongPair) return;

    playTapSound();
    setSelectedRight(index);
    if (selectedLeft !== null) {
      checkMatch(selectedLeft, index);
    }
  };

  const isLeftMatched = (index: number) => matchedPairs.has(leftItems[index]);
  const isRightMatched = (index: number) => {
    const rightWord = shuffledRight[index];
    return Array.from(matchedPairs).some(
      (leftWord) => pairs.find((p) => p.left === leftWord)?.right === rightWord
    );
  };

  return (
    <div className="space-y-8">
      {/* Question */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
        {question}
      </h2>

      {/* Matching columns */}
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {/* Left column */}
        <div className="space-y-3">
          {leftItems.map((item, index) => (
            <button
              key={`left-${index}`}
              onClick={() => handleLeftClick(index)}
              disabled={isLeftMatched(index)}
              className={cn(
                "w-full p-4 rounded-2xl border-2 font-semibold text-center transition-all",
                isLeftMatched(index) &&
                  "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 opacity-60",
                !isLeftMatched(index) && selectedLeft === index &&
                  "border-primary bg-primary/10 text-primary scale-105 shadow-md",
                !isLeftMatched(index) && selectedLeft !== index &&
                  "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                wrongPair?.left === index &&
                  "border-red-500 bg-red-100 dark:bg-red-900/20 text-red-600 animate-shake"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {shuffledRight.map((item, index) => (
            <button
              key={`right-${index}`}
              onClick={() => handleRightClick(index)}
              disabled={isRightMatched(index)}
              className={cn(
                "w-full p-4 rounded-2xl border-2 font-semibold text-center transition-all",
                isRightMatched(index) &&
                  "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 opacity-60",
                !isRightMatched(index) && selectedRight === index &&
                  "border-primary bg-primary/10 text-primary scale-105 shadow-md",
                !isRightMatched(index) && selectedRight !== index &&
                  "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                wrongPair?.right === index &&
                  "border-red-500 bg-red-100 dark:bg-red-900/20 text-red-600 animate-shake"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {matchedPairs.size} / {pairs.length} pairs matched
        {mistakes > 0 && (
          <span className="ml-2 text-red-500">({mistakes} mistake{mistakes > 1 ? "s" : ""})</span>
        )}
      </div>

      {/* Completion message */}
      {isComplete && (
        <div className="text-center">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            All pairs matched! 🎉
          </p>
        </div>
      )}
    </div>
  );
}
