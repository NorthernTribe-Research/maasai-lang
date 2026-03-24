import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Volume2, Heart, MessageSquare, Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { WordBankExercise } from "./WordBankExercise";
import { FillInBlankExercise } from "./FillInBlankExercise";
import { MatchingPairsExercise } from "./MatchingPairsExercise";
import { CharacterWritingExercise } from "./CharacterWritingExercise";
import { LessonCompleteModal } from "./LessonCompleteModal";
import { XPPopup } from "./XPPopup";
import { HeartLossAnimation } from "./HeartLossAnimation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { playCorrectSound, playIncorrectSound, playLevelUpSound, playHeartLossSound } from "@/lib/sounds";

export interface Exercise {
  id: string;
  type: "multiple-choice" | "word-bank" | "fill-blank" | "matching" | "translate" | "listening" | "character-writing";
  question: string;
  options?: string[];
  words?: string[];
  /** For fill-blank: the sentence with ___ */
  sentence?: string;
  /** For matching: array of pairs */
  pairs?: { left: string; right: string }[];
  correctAnswer: string | string[];
  character?: string;
  pinyin?: string;
  audioUrl?: string;
  explanation?: string;
}

interface LessonInterfaceProps {
  lessonId: string;
  exercises: Exercise[];
  onComplete: () => void;
  onExit: () => void;
}

interface UserStats {
  hearts: number;
  maxHearts: number;
  xp: number;
  level: number;
  streak: number;
  unlimitedHearts?: boolean;
}

interface ExplainAnswerResponse {
  summary: string;
  whyExpectedAnswerWorks: string;
  keyDifference: string;
  tips: string[];
  suggestedRetry?: string;
  source?: "ai" | "fallback";
}

interface RoleplayResponse {
  assistantMessage: string;
  coachTip: string;
  suggestedReplies: string[];
  source?: "ai" | "fallback";
}

interface RoleplayTurn {
  role: "assistant" | "user";
  content: string;
}

export function LessonInterface({
  lessonId,
  exercises,
  onComplete,
  onExit,
}: LessonInterfaceProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showXPPopup, setShowXPPopup] = useState(false);
  const [showHeartLoss, setShowHeartLoss] = useState(false);
  const [xpPopupAmount, setXpPopupAmount] = useState(0);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState("");
  const [answerExplanation, setAnswerExplanation] = useState<ExplainAnswerResponse | null>(null);
  const [roleplayOpen, setRoleplayOpen] = useState(false);
  const [roleplayInput, setRoleplayInput] = useState("");
  const [roleplayTurns, setRoleplayTurns] = useState<RoleplayTurn[]>([]);
  const [roleplayCoachTip, setRoleplayCoachTip] = useState("");
  const [roleplaySuggestions, setRoleplaySuggestions] = useState<string[]>([]);

  // Fetch user stats for hearts display
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user-stats/stats"],
    queryFn: async () => {
      const res = await fetch("/api/user-stats/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Mutation for losing a heart
  const loseHeartMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user-stats/hearts/lose", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to lose heart");
      return res.json() as Promise<{ hearts: number; gameOver: boolean; heartConsumed?: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
    },
  });

  // Mutation for awarding XP
  const awardXPMutation = useMutation({
    mutationFn: async (xp: number) => {
      const res = await fetch("/api/user-stats/xp/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: xp,
          source: "lesson",
          sourceId: lessonId,
        }),
      });
      if (!res.ok) throw new Error("Failed to award XP");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats/stats"] });
    },
  });

  const explainAnswerMutation = useMutation({
    mutationFn: async () => {
      if (!currentExercise) {
        throw new Error("No active exercise.");
      }

      const response = await fetch("/api/ai/explain-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: currentExercise.question,
          userAnswer: lastSubmittedAnswer,
          correctAnswer: Array.isArray(currentExercise.correctAnswer)
            ? currentExercise.correctAnswer.join(" ")
            : currentExercise.correctAnswer,
          exerciseType: currentExercise.type,
          lessonId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to explain answer");
      }

      return response.json() as Promise<ExplainAnswerResponse>;
    },
    onSuccess: (data) => {
      setAnswerExplanation(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not explain answer",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const roleplayMutation = useMutation({
    mutationFn: async (params: { learnerMessage?: string; history: RoleplayTurn[] }) => {
      if (!currentExercise) {
        throw new Error("No active exercise.");
      }

      const response = await fetch("/api/ai/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scenario: currentExercise.question,
          expectedAnswer: Array.isArray(currentExercise.correctAnswer)
            ? currentExercise.correctAnswer.join(" ")
            : currentExercise.correctAnswer,
          learnerMessage: params.learnerMessage || "",
          history: params.history,
          exerciseType: currentExercise.type,
          lessonId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to load roleplay");
      }

      return response.json() as Promise<RoleplayResponse>;
    },
    onError: (error: Error) => {
      toast({
        title: "Roleplay unavailable",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;
  const isLastQuestion = currentIndex === exercises.length - 1;
  const autoAdvanceExerciseTypes = new Set([
    "word-bank",
    "fill-blank",
    "matching",
    "character-writing",
  ]);

  useEffect(() => {
    setAnswerExplanation(null);
    setLastSubmittedAnswer("");
    setRoleplayInput("");
    setRoleplayTurns([]);
    setRoleplayCoachTip("");
    setRoleplaySuggestions([]);
    setRoleplayOpen(false);
  }, [currentIndex]);

  const requestAnswerExplanation = () => {
    if (!lastSubmittedAnswer.trim()) {
      toast({
        title: "No answer submitted yet",
        description: "Submit an answer first so we can explain it clearly.",
      });
      return;
    }

    explainAnswerMutation.mutate();
  };

  const startRoleplay = async () => {
    setRoleplayOpen(true);

    if (roleplayTurns.length > 0 || roleplayMutation.isPending) {
      return;
    }

    try {
      const payload = await roleplayMutation.mutateAsync({ history: [] });
      setRoleplayTurns([{ role: "assistant", content: payload.assistantMessage }]);
      setRoleplayCoachTip(payload.coachTip);
      setRoleplaySuggestions(payload.suggestedReplies || []);
    } catch {
      // Error handling is done in mutation onError.
    }
  };

  const sendRoleplayMessage = async () => {
    const learnerMessage = roleplayInput.trim();
    if (!learnerMessage || roleplayMutation.isPending) {
      return;
    }

    const userTurn: RoleplayTurn = { role: "user", content: learnerMessage };
    const nextHistory = [...roleplayTurns, userTurn];
    setRoleplayTurns(nextHistory);
    setRoleplayInput("");

    try {
      const payload = await roleplayMutation.mutateAsync({
        learnerMessage,
        history: nextHistory,
      });

      setRoleplayTurns((prev) => [
        ...prev,
        { role: "assistant", content: payload.assistantMessage },
      ]);
      setRoleplayCoachTip(payload.coachTip);
      setRoleplaySuggestions(payload.suggestedReplies || []);
    } catch {
      // Error handling is done in mutation onError.
    }
  };

  const handleAnswer = async (answer: string) => {
    if (isChecking) return;

    setIsChecking(true);
    setLastSubmittedAnswer(answer);
    setAnswerExplanation(null);
    const correctAnswerStr = Array.isArray(currentExercise.correctAnswer)
      ? currentExercise.correctAnswer.join(" ")
      : currentExercise.correctAnswer;

    const isCorrect = answer.toLowerCase().trim() === correctAnswerStr.toLowerCase().trim();
    setFeedback(isCorrect ? "correct" : "incorrect");

    if (isCorrect) {
      playCorrectSound();
      setScore(score + 1);
      // Show +XP popup for each correct answer
      setXpPopupAmount(2);
      setShowXPPopup(true);
    } else {
      playIncorrectSound();
      // Lose a heart on wrong answer
      playHeartLossSound();
      setShowHeartLoss(true);
      let gameOver = false;
      try {
        const loseHeartResult = await loseHeartMutation.mutateAsync();
        gameOver = !!loseHeartResult?.gameOver;
      } catch (e) {
        // ignore
      }

      // Check if game over
      if (gameOver) {
        setTimeout(() => {
          onExit();
        }, 1500);
        return;
      }
    }

    if (!autoAdvanceExerciseTypes.has(currentExercise.type)) {
      return;
    }

    setTimeout(() => {
      if (isLastQuestion) {
        handleLessonComplete();
      } else {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setFeedback(null);
        setIsChecking(false);
      }
    }, 1500);
  };

  const handleLessonComplete = async () => {
    const accuracy = Math.round((score / exercises.length) * 100);
    const xpEarned = 10 + (accuracy === 100 ? 5 : 0);

    playLevelUpSound();

    // Award XP
    try {
      await awardXPMutation.mutateAsync(xpEarned);
    } catch (e) {
      // ignore
    }

    // Show XP popup
    setXpPopupAmount(xpEarned);
    setShowXPPopup(true);

    setTimeout(() => {
      setShowCompletionModal(true);
    }, 500);
  };

  const handleModalClose = () => {
    setShowCompletionModal(false);
    onComplete();
  };

  const playAudio = () => {
    if (currentExercise.audioUrl) {
      const audio = new Audio(currentExercise.audioUrl);
      audio.play();
    }
  };

  if (!currentExercise) return null;

  return (
    <>
      {/* XP Popup */}
      <XPPopup amount={xpPopupAmount} show={showXPPopup} onComplete={() => setShowXPPopup(false)} />

      {/* Heart Loss Animation */}
      <HeartLossAnimation show={showHeartLoss} onComplete={() => setShowHeartLoss(false)} />

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
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              <span className="font-bold text-lg">{stats?.unlimitedHearts ? "∞" : stats?.hearts ?? 5}</span>
            </div>
          </div>
        </div>

        {/* Exercise Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl space-y-8">
            {/* Fill-in-Blank Exercise */}
            {currentExercise.type === "fill-blank" && currentExercise.sentence && currentExercise.options && (
              <FillInBlankExercise
                question={currentExercise.question}
                sentence={currentExercise.sentence}
                options={currentExercise.options}
                correctAnswer={typeof currentExercise.correctAnswer === "string" ? currentExercise.correctAnswer : currentExercise.correctAnswer[0]}
                onAnswer={(isCorrect, userAnswer) => handleAnswer(userAnswer)}
              />
            )}

            {/* Matching Pairs Exercise */}
            {currentExercise.type === "matching" && currentExercise.pairs && (
              <MatchingPairsExercise
                question={currentExercise.question}
                pairs={currentExercise.pairs}
                onAnswer={(isCorrect, userAnswer) => handleAnswer(
                  isCorrect ? (typeof currentExercise.correctAnswer === "string" ? currentExercise.correctAnswer : currentExercise.correctAnswer[0]) : "wrong"
                )}
              />
            )}

            {/* Word Bank Exercise */}
            {currentExercise.type === "word-bank" && currentExercise.words && (
              <WordBankExercise
                question={currentExercise.question}
                words={currentExercise.words}
                correctAnswer={currentExercise.correctAnswer as string[]}
                onAnswer={(isCorrect, userAnswer) => handleAnswer(userAnswer)}
              />
            )}

            {/* Character Writing Exercise */}
            {currentExercise.type === "character-writing" && currentExercise.character && (
              <CharacterWritingExercise
                question={currentExercise.question}
                character={currentExercise.character}
                pinyin={currentExercise.pinyin}
                onAnswer={(isCorrect, userAnswer) => {
                  const targetAnswer = typeof currentExercise.correctAnswer === "string" 
                    ? currentExercise.correctAnswer 
                    : currentExercise.correctAnswer[0];
                  // Automatically count it correct if they draw and submit it.
                  handleAnswer(targetAnswer);
                }}
              />
            )}

            {/* Multiple Choice Exercise */}
            {currentExercise.type === "multiple-choice" && currentExercise.options && (
              <>
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
              </>
            )}

            {/* Translation Exercise */}
            {currentExercise.type === "translate" && (
              <>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {currentExercise.question}
                  </h2>
                </div>
                <input
                  type="text"
                  placeholder="Type your translation..."
                  disabled={isChecking}
                  value={selectedAnswer || ""}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && selectedAnswer) {
                      handleAnswer(selectedAnswer);
                    }
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-gray-300 dark:border-gray-700 focus:border-primary focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                />
              </>
            )}

            {/* Listening Exercise */}
            {currentExercise.type === "listening" && currentExercise.options && (
              <>
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentExercise.question}
                  </h2>
                  <button
                    onClick={playAudio}
                    className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center mx-auto shadow-lg transition-transform hover:scale-110"
                  >
                    <Volume2 className="h-8 w-8" />
                  </button>
                </div>

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
              </>
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
                  {currentExercise.explanation && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {currentExercise.explanation}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={requestAnswerExplanation}
                      disabled={explainAnswerMutation.isPending}
                      className="bg-white/80 dark:bg-gray-900"
                    >
                      {explainAnswerMutation.isPending ? "Explaining..." : "Explain My Answer"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startRoleplay}
                      disabled={roleplayMutation.isPending && roleplayTurns.length === 0}
                      className="bg-white/80 dark:bg-gray-900"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Roleplay
                    </Button>
                  </div>
                  {answerExplanation && (
                    <div className="mt-3 rounded-xl border border-red-200 dark:border-red-900 bg-white/80 dark:bg-gray-900/60 p-3 space-y-2">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {answerExplanation.summary}
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {answerExplanation.whyExpectedAnswerWorks}
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {answerExplanation.keyDifference}
                      </p>
                      {answerExplanation.tips.length > 0 && (
                        <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                          {answerExplanation.tips.slice(0, 3).map((tip) => (
                            <li key={tip}>• {tip}</li>
                          ))}
                        </ul>
                      )}
                      {answerExplanation.suggestedRetry && (
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                          Try: {answerExplanation.suggestedRetry}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Check/Continue Button — only for types that don't self-submit */}
            {!["word-bank", "fill-blank", "matching", "character-writing"].includes(currentExercise.type) && (
              <Button
                onClick={() => {
                  if (feedback) {
                    if (isLastQuestion) {
                      handleLessonComplete();
                    } else {
                      setCurrentIndex(currentIndex + 1);
                      setSelectedAnswer(null);
                      setFeedback(null);
                      setIsChecking(false);
                    }
                  } else {
                    handleAnswer(selectedAnswer || "");
                  }
                }}
                disabled={!selectedAnswer && !feedback}
                size="lg"
                className={cn(
                  "rounded-2xl font-bold px-8",
                  feedback === "incorrect" && "bg-red-600 hover:bg-red-700"
                )}
              >
                {feedback ? "Continue" : "Check"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={roleplayOpen} onOpenChange={setRoleplayOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Roleplay Practice
            </DialogTitle>
            <DialogDescription>
              Practice this question in a live scenario with your AI coach.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
            Scenario: {currentExercise.question}
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border p-3 space-y-3">
            {roleplayTurns.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Loading roleplay...
              </p>
            )}

            {roleplayTurns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    turn.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {turn.content}
                </div>
              </div>
            ))}
          </div>

          {roleplayCoachTip && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary">Coach tip</p>
              <p className="text-sm text-foreground">{roleplayCoachTip}</p>
            </div>
          )}

          {roleplaySuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {roleplaySuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRoleplayInput(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={roleplayInput}
              onChange={(e) => setRoleplayInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void sendRoleplayMessage();
                }
              }}
              placeholder="Reply in the target language..."
              disabled={roleplayMutation.isPending}
            />
            <Button
              type="button"
              onClick={() => void sendRoleplayMessage()}
              disabled={!roleplayInput.trim() || roleplayMutation.isPending}
            >
              {roleplayMutation.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Complete Modal */}
      <LessonCompleteModal
        open={showCompletionModal}
        onClose={handleModalClose}
        xpEarned={10 + (score === exercises.length ? 5 : 0)}
        streakDays={stats?.streak || 0}
        accuracyPercent={Math.round((score / exercises.length) * 100)}
      />
    </>
  );
}
