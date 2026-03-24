import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  type: "multiple-choice" | "fill-blank" | "translate" | "listen" | "speak";
  question: string;
  options?: string[];
  correctAnswer: string;
  audioUrl?: string;
}

interface LessonInterfaceProps {
  lessonId: string;
  exercises: Exercise[];
  onComplete: (score: number) => void;
  onExit: () => void;
}

export function LessonInterface({
  lessonId,
  exercises,
  onComplete,
  onExit,
}: LessonInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState(0);

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;

  const handleCheck = () => {
    if (!selectedAnswer) return;

    setIsChecking(true);
    const isCorrect = selectedAnswer === currentExercise.correctAnswer;
    setFeedback(isCorrect ? "correct" : "incorrect");

    if (isCorrect) {
      setScore(score + 1);
    }

    setTimeout(() => {
      if (currentIndex < exercises.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setFeedback(null);
        setIsChecking(false);
      } else {
        // Lesson complete
        const finalScore = Math.round((score / exercises.length) * 100);
        onComplete(finalScore);
      }
    }, 1500);
  };

  const playAudio = () => {
    if (currentExercise.audioUrl) {
      const audio = new Audio(currentExercise.audioUrl);
      audio.play();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header with Progress */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          <Progress value={progress} className="flex-1 h-3" />
        </div>
      </div>

      {/* Exercise Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-8">
          {/* Question */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {currentExercise.question}
            </h2>
            {currentExercise.audioUrl && (
              <Button
                variant="outline"
                size="lg"
                onClick={playAudio}
                className="rounded-full"
              >
                <Volume2 className="h-5 w-5 mr-2" />
                Play Audio
              </Button>
            )}
          </div>

          {/* Answer Options */}
          {currentExercise.type === "multiple-choice" && currentExercise.options && (
            <div className="space-y-3">
              {currentExercise.options.map((option) => (
                <button
                  key={option}
                  onClick={() => !isChecking && setSelectedAnswer(option)}
                  disabled={isChecking}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left font-medium transition-all",
                    selectedAnswer === option
                      ? feedback === "correct"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : feedback === "incorrect"
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : "border-primary bg-primary/10"
                      : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                    isChecking && "cursor-not-allowed"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        className={cn(
          "sticky bottom-0 border-t transition-colors",
          feedback === "correct"
            ? "bg-green-100 dark:bg-green-900/30 border-green-300"
            : feedback === "incorrect"
            ? "bg-red-100 dark:bg-red-900/30 border-red-300"
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        )}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Feedback Message */}
          <div className="flex-1">
            {feedback === "correct" && (
              <p className="text-lg font-bold text-green-700 dark:text-green-400">
                Excellent! 🎉
              </p>
            )}
            {feedback === "incorrect" && (
              <div>
                <p className="text-lg font-bold text-red-700 dark:text-red-400 mb-1">
                  Not quite!
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Correct answer: {currentExercise.correctAnswer}
                </p>
              </div>
            )}
          </div>

          {/* Check/Continue Button */}
          <Button
            onClick={handleCheck}
            disabled={!selectedAnswer || isChecking}
            size="lg"
            className={cn(
              "rounded-2xl font-bold px-8",
              feedback === "incorrect" && "bg-red-600 hover:bg-red-700"
            )}
          >
            {feedback ? "Continue" : "Check"}
          </Button>
        </div>
      </div>
    </div>
  );
}
