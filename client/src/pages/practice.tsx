import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { DuolingoLayout } from "@/components/duolingo/DuolingoLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Mic, RotateCcw, CheckCircle, XCircle, Flame, Dumbbell, MessageSquare, GraduationCap, Headphones, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Language, UserLanguage, Challenge, DailyChallenge } from "@shared/schema";

enum PracticeType {
  DAILY_CHALLENGE = "daily-challenge",
  VOCABULARY = "vocabulary",
  GRAMMAR = "grammar",
  CONVERSATION = "conversation",
  PRONUNCIATION = "pronunciation",
}

interface Exercise {
  question: string;
  answer: string;
  options?: string[];
  type: "multiple-choice" | "translation";
}

const PRACTICE_MODES = [
  {
    id: PracticeType.DAILY_CHALLENGE,
    title: "Daily Challenge",
    description: "Complete today's challenge to maintain your streak",
    icon: Flame,
    color: "bg-orange-500",
    lightBg: "bg-orange-100 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    xp: 30
  },
  {
    id: PracticeType.VOCABULARY,
    title: "Vocabulary Review",
    description: "Strengthen your word knowledge",
    icon: GraduationCap,
    color: "bg-blue-500",
    lightBg: "bg-blue-100 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    xp: 20
  },
  {
    id: PracticeType.GRAMMAR,
    title: "Grammar Practice",
    description: "Master sentence structures and rules",
    icon: Dumbbell,
    color: "bg-green-500",
    lightBg: "bg-green-100 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    xp: 25
  },
  {
    id: PracticeType.CONVERSATION,
    title: "Conversation",
    description: "Practice real-world dialogues",
    icon: MessageSquare,
    color: "bg-purple-500",
    lightBg: "bg-purple-100 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    xp: 35
  },
  {
    id: PracticeType.PRONUNCIATION,
    title: "Pronunciation",
    description: "Speak clearly and confidently",
    icon: Headphones,
    color: "bg-pink-500",
    lightBg: "bg-pink-100 dark:bg-pink-900/20",
    borderColor: "border-pink-200 dark:border-pink-800",
    xp: 25
  }
];

export default function Practice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeMode, setActiveMode] = useState<PracticeType | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Queries
  const { data: userLanguages, isLoading: isLoadingLanguages } = useQuery<Array<UserLanguage & {language: Language}>>({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });
  
  const { data: dailyChallenge, isLoading: isLoadingChallenge } = useQuery<DailyChallenge & {challenge: Challenge}>({
    queryKey: ["/api/user/daily-challenge"],
    enabled: activeMode === PracticeType.DAILY_CHALLENGE && !!user,
  });

  // Set default language when languages load
  useEffect(() => {
    if (userLanguages && userLanguages.length > 0 && !selectedLanguage) {
      setSelectedLanguage(userLanguages[0].languageId.toString());
    }
  }, [userLanguages, selectedLanguage]);
  
  // Mutations
  const generateExerciseMutation = useMutation({
    mutationFn: async (data: { language: string; type: string }) => {
      const res = await apiRequest("POST", "/api/practice/generate", data);
      return res.json();
    },
    onSuccess: (data: Exercise) => {
      setCurrentExercise(data);
      setIsGenerating(false);
    },
    onError: (error) => {
      toast({
        title: "Error generating exercise",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
      setActiveMode(null);
    }
  });
  
  const checkTranslationMutation = useMutation({
    mutationFn: async (data: { original: string; translation: string; language: string }) => {
      const res = await apiRequest("POST", "/api/practice/check-translation", data);
      return res.json();
    },
    onSuccess: (data: { isCorrect: boolean; feedback: string; correctedTranslation?: string }) => {
      setResult(data.isCorrect ? "correct" : "incorrect");
      toast({
        title: data.isCorrect ? "Correct!" : "Not quite right",
        description: data.feedback,
        variant: data.isCorrect ? "default" : "destructive",
      });
      setIsChecking(false);
    },
    onError: (error) => {
      toast({
        title: "Error checking answer",
        description: error.message,
        variant: "destructive",
      });
      setIsChecking(false);
    }
  });

  const generateExercise = (targetMode: PracticeType, targetLangId: string) => {
    if (targetMode === PracticeType.DAILY_CHALLENGE) return; // Daily challenge is fetched natively
    
    setIsGenerating(true);
    setResult(null);
    setUserAnswer("");
    
    const languageId = parseInt(targetLangId);
    const language = userLanguages?.find(ul => ul.languageId === languageId)?.language;
    
    if (!language) {
      setIsGenerating(false);
      toast({ title: "Please select a language first", variant: "destructive" });
      return;
    }
    
    generateExerciseMutation.mutate({
      language: language.name,
      type: targetMode.toLowerCase(),
    });
  };

  const handleModeSelect = (mode: PracticeType) => {
    setActiveMode(mode);
    if (mode !== PracticeType.DAILY_CHALLENGE && selectedLanguage) {
      generateExercise(mode, selectedLanguage);
    }
  };

  const handleCheckAnswer = () => {
    if (!currentExercise || !userAnswer) return;
    setIsChecking(true);
    
    const languageId = parseInt(selectedLanguage);
    const language = userLanguages?.find(ul => ul.languageId === languageId)?.language;
    
    if (currentExercise.type === "translation" && language && activeMode !== PracticeType.DAILY_CHALLENGE) {
      checkTranslationMutation.mutate({
        original: currentExercise.question,
        translation: userAnswer,
        language: language.name,
      });
    } else {
      const isCorrect = userAnswer.toLowerCase().trim() === currentExercise.answer.toLowerCase().trim();
      setResult(isCorrect ? "correct" : "incorrect");
      toast({
        title: isCorrect ? "Correct!" : "Not quite right",
        description: isCorrect ? "Great job!" : `The correct answer is: ${currentExercise.answer}`,
        variant: isCorrect ? "default" : "destructive",
      });
      setIsChecking(false);
    }
  };

  // Render content based on active mode
  const renderExerciseContent = () => {
    if (activeMode === PracticeType.DAILY_CHALLENGE) {
      return renderDailyChallenge();
    }
    
    if (isGenerating) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (!currentExercise) return null;

    return (
      <div className="animate-in slide-in-from-bottom-4 duration-300">
        <h3 className="text-xl font-bold mb-6 text-foreground">{currentExercise.question}</h3>
        
        {currentExercise.type === "multiple-choice" && currentExercise.options ? (
          <RadioGroup value={userAnswer} onValueChange={setUserAnswer} className="space-y-3">
            {currentExercise.options.map((option, idx) => (
              <div 
                key={idx} 
                className={`flex items-center space-x-2 border-2 rounded-xl p-4 cursor-pointer transition-colors
                  ${userAnswer === option ? 'border-primary bg-primary/5' : 'border-neutral-200 dark:border-neutral-800 hover:border-primary/50'}
                `}
                onClick={() => setUserAnswer(option)}
              >
                <RadioGroupItem value={option} id={`option-${idx}`} className="sr-only" />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-base font-medium">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Type your translation here..."
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full text-lg p-6 border-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userAnswer && !isChecking) {
                  handleCheckAnswer();
                }
              }}
            />
          </div>
        )}

        {result && (
          <div className={`mt-6 p-4 rounded-xl border-2 flex items-center ${
            result === "correct" 
              ? "bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800 text-green-700 dark:text-green-400" 
              : "bg-red-100 border-red-200 dark:bg-red-900/30 dark:border-red-800 text-red-700 dark:text-red-400"
          }`}>
            {result === "correct" ? <CheckCircle className="h-6 w-6 mr-3" /> : <XCircle className="h-6 w-6 mr-3" />}
            <p className="font-semibold text-lg">
              {result === "correct" ? "Excellent!" : `Correct answer: ${currentExercise.answer}`}
            </p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t flex justify-between items-center bg-background/80 backdrop-blur pb-4">
          <Button variant="ghost" className="text-neutral-500" onClick={() => activeMode && generateExercise(activeMode, selectedLanguage)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Skip
          </Button>
          <Button 
            size="lg"
            className={`px-8 font-bold text-lg ${result === "correct" ? "bg-green-500 hover:bg-green-600" : result === "incorrect" ? "bg-red-500 hover:bg-red-600" : ""}`}
            onClick={result ? () => activeMode && generateExercise(activeMode, selectedLanguage) : handleCheckAnswer}
            disabled={!userAnswer || isChecking}
          >
            {isChecking ? <Loader2 className="h-5 w-5 animate-spin" /> : result ? "Continue" : "Check"}
          </Button>
        </div>
      </div>
    );
  };

  const renderDailyChallenge = () => {
    if (isLoadingChallenge) return <Skeleton className="h-64 w-full rounded-xl" />;
    if (!dailyChallenge || !dailyChallenge.challenge) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌟</div>
          <h3 className="text-xl font-bold mb-2">No Challenges Today</h3>
          <p className="text-neutral-500 mb-6">Come back tomorrow or start learning a new language!</p>
          <Button onClick={() => setLocation('/')}>Go to Lessons</Button>
        </div>
      );
    }

    if (dailyChallenge.isCompleted) {
      return (
        <div className="text-center py-12 animate-in zoom-in duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Challenge Completed!</h3>
          <p className="text-neutral-500 mb-6">You've earned your XP for today's challenge. Tremendous work!</p>
          <Button onClick={() => setActiveMode(null)} variant="outline">Back to Practice</Button>
        </div>
      );
    }

    return (
      <div className="animate-in slide-in-from-bottom-4 duration-300">
        <h3 className="text-xl font-bold mb-6">{dailyChallenge.challenge.prompt}</h3>
        <Input
          placeholder="Type your answer here..."
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          className="w-full text-lg p-6 border-2 mb-8"
        />
        {result && (
          <div className={`mb-8 p-4 rounded-xl border-2 flex items-center ${
            result === "correct" 
              ? "bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800 text-green-700 dark:text-green-400" 
              : "bg-red-100 border-red-200 dark:bg-red-900/30 dark:border-red-800 text-red-700 dark:text-red-400"
          }`}>
            {result === "correct" ? <CheckCircle className="h-6 w-6 mr-3" /> : <XCircle className="h-6 w-6 mr-3" />}
            <p className="font-semibold text-lg">
              {result === "correct" ? "Excellent!" : `Correct answer: ${dailyChallenge.challenge.answer}`}
            </p>
          </div>
        )}
        <div className="flex justify-between items-center border-t pt-4">
          <Button variant="ghost" onClick={() => setActiveMode(null)}>Cancel</Button>
          <Button 
            size="lg"
            className="px-8 font-bold"
            onClick={() => {
              const isCorrect = userAnswer.toLowerCase().trim() === dailyChallenge.challenge.answer.toLowerCase().trim();
              setResult(isCorrect ? "correct" : "incorrect");
              if (isCorrect) toast({ title: "Challenge Complete! +30 XP" });
            }}
            disabled={!userAnswer}
          >
            Check Answer
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DuolingoLayout>
      {!activeMode ? (
        // Practice Selection Screen
        <div className="animate-in fade-in duration-500">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold mb-2 text-foreground">Practice Hub</h1>
            <p className="text-muted-foreground text-lg">Sharpen your skills to earn extra XP and master your target language.</p>
          </div>

          <div className="mb-8 p-4 bg-primary/10 rounded-2xl border-2 border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-primary uppercase tracking-wider">Target Language</span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm">Select which language to practice</span>
            </div>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full md:w-64 bg-background">
                <SelectValue placeholder="🌐 Select language" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingLanguages ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : userLanguages && userLanguages.length > 0 ? (
                  userLanguages.map((ul) => (
                    <SelectItem key={ul.languageId} value={ul.languageId.toString()}>
                      {ul.language.flag} {ul.language.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No languages enrolled</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
            {PRACTICE_MODES.map((mode, index) => (
              <div 
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                className={`group cursor-pointer rounded-2xl border-2 p-5 transition-all hover:-translate-y-1 hover:shadow-lg bg-background ${mode.borderColor}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-2xl ${mode.lightBg} ${mode.color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform`}>
                    <mode.icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg text-foreground">{mode.title}</h3>
                      <div className="flex items-center text-sm font-bold text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                        +{mode.xp} XP
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">{mode.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Active Practice Session
        <div className="flex flex-col h-full relative">
          <div className="flex items-center mb-8 sticky top-0 bg-background/95 backdrop-blur z-10 py-4 -mx-4 px-4 border-b">
            <Button variant="ghost" size="icon" onClick={() => setActiveMode(null)} className="mr-4">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">
                {PRACTICE_MODES.find(m => m.id === activeMode)?.title}
              </h2>
            </div>
            {selectedLanguage && activeMode !== PracticeType.DAILY_CHALLENGE && (
              <div className="text-2xl">
                {userLanguages?.find(ul => ul.languageId.toString() === selectedLanguage)?.language.flag}
              </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {renderExerciseContent()}
          </div>
        </div>
      )}
    </DuolingoLayout>
  );
}
