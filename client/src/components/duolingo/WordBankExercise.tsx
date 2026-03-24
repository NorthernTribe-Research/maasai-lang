import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WordBankExerciseProps {
  question: string;
  words: string[];
  correctAnswer: string[];
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
}

export function WordBankExercise({
  question,
  words,
  correctAnswer,
  onAnswer,
}: WordBankExerciseProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>(words);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleWordClick = (word: string) => {
    if (isChecked) return;

    setSelectedWords([...selectedWords, word]);
    setAvailableWords(availableWords.filter((w) => w !== word));
  };

  const handleSelectedWordClick = (word: string, index: number) => {
    if (isChecked) return;

    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setAvailableWords([...availableWords, word]);
  };

  const handleCheck = () => {
    const userAnswer = selectedWords.join(" ");
    const correct = correctAnswer.join(" ");
    const isAnswerCorrect = userAnswer === correct;

    setIsCorrect(isAnswerCorrect);
    setIsChecked(true);

    setTimeout(() => {
      onAnswer(isAnswerCorrect, userAnswer);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Question */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {question}
      </h2>

      {/* Answer Area */}
      <div
        className={cn(
          "min-h-[80px] p-4 rounded-2xl border-2 border-dashed transition-colors",
          isChecked
            ? isCorrect
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-red-500 bg-red-50 dark:bg-red-900/20"
            : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        )}
      >
        {selectedWords.length === 0 ? (
          <p className="text-gray-400 text-center">Tap the words below to build your answer</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedWords.map((word, index) => (
              <button
                key={`${word}-${index}`}
                onClick={() => handleSelectedWordClick(word, index)}
                disabled={isChecked}
                className={cn(
                  "px-4 py-2 rounded-xl font-medium transition-all",
                  isChecked
                    ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary/90"
                )}
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Word Bank */}
      <div className="flex flex-wrap gap-2 justify-center">
        {availableWords.map((word, index) => (
          <button
            key={`${word}-${index}`}
            onClick={() => handleWordClick(word)}
            disabled={isChecked}
            className={cn(
              "px-4 py-2 rounded-xl border-2 font-medium transition-all",
              isChecked
                ? "border-gray-300 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                : "border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-primary/10"
            )}
          >
            {word}
          </button>
        ))}
      </div>

      {/* Check Button */}
      {!isChecked && (
        <Button
          onClick={handleCheck}
          disabled={selectedWords.length === 0}
          size="lg"
          className="w-full rounded-2xl font-bold"
        >
          Check
        </Button>
      )}

      {/* Feedback */}
      {isChecked && (
        <div
          className={cn(
            "p-4 rounded-2xl text-center font-semibold",
            isCorrect
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
          )}
        >
          {isCorrect ? (
            <p className="text-lg">✓ Perfect!</p>
          ) : (
            <div>
              <p className="text-lg mb-2">✗ Not quite!</p>
              <p className="text-sm">Correct answer: {correctAnswer.join(" ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
