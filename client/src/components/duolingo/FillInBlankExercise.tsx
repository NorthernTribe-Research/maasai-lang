import { useState } from "react";
import { cn } from "@/lib/utils";
import { playTapSound } from "@/lib/sounds";

interface FillInBlankExerciseProps {
  question: string;
  /** The sentence with ___ for the blank */
  sentence: string;
  options: string[];
  correctAnswer: string;
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
}

export function FillInBlankExercise({
  question,
  sentence,
  options,
  correctAnswer,
  onAnswer,
}: FillInBlankExerciseProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const parts = sentence.split("___");
  const beforeBlank = parts[0] || "";
  const afterBlank = parts[1] || "";

  const handleSelect = (option: string) => {
    if (submitted) return;
    playTapSound();
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (!selectedOption || submitted) return;
    const correct = selectedOption.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswer(correct, selectedOption);
  };

  return (
    <div className="space-y-8">
      {/* Question */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
        {question}
      </h2>

      {/* Sentence with blank */}
      <div className="text-center text-xl leading-relaxed text-gray-800 dark:text-gray-200">
        <span>{beforeBlank}</span>
        <span
          className={cn(
            "inline-block min-w-[120px] mx-2 px-4 py-2 rounded-xl border-2 border-dashed font-bold text-center transition-all",
            !selectedOption && "border-gray-400 text-gray-400",
            selectedOption && !submitted && "border-primary bg-primary/10 text-primary",
            submitted && isCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
            submitted && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
          )}
        >
          {selectedOption || "___"}
        </span>
        <span>{afterBlank}</span>
      </div>

      {/* Options */}
      <div className="flex flex-wrap justify-center gap-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={submitted}
            className={cn(
              "px-6 py-3 rounded-2xl border-2 font-semibold transition-all text-base",
              selectedOption === option
                ? submitted
                  ? isCorrect
                    ? "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700"
                    : "border-red-500 bg-red-100 dark:bg-red-900/30 text-red-700"
                  : "border-primary bg-primary/10 text-primary scale-105 shadow-md"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
              submitted && option === correctAnswer && "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700",
              submitted && "cursor-not-allowed opacity-80"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className={cn(
              "px-12 py-4 rounded-2xl font-bold text-lg transition-all",
              selectedOption
                ? "bg-primary text-white hover:bg-primary/90 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            Check
          </button>
        </div>
      )}
    </div>
  );
}
