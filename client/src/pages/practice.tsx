import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Mic, RotateCcw, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Language, UserLanguage, Challenge, DailyChallenge } from "@shared/schema";

enum PracticeType {
  DAILY_CHALLENGE = "daily-challenge",
  VOCABULARY = "vocabulary",
  GRAMMAR = "grammar",
  CONVERSATION = "conversation",
}

interface Exercise {
  question: string;
  answer: string;
  options?: string[];
  type: "multiple-choice" | "translation";
}

export default function Practice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [practiceType, setPracticeType] = useState<PracticeType>(PracticeType.DAILY_CHALLENGE);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  
  // Fetch user's languages
  const { data: userLanguages, isLoading: isLoadingLanguages } = useQuery<Array<UserLanguage & {language: Language}>>({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });
  
  // Fetch daily challenge
  const { data: dailyChallenge, isLoading: isLoadingChallenge } = useQuery<DailyChallenge & {challenge: Challenge}>({
    queryKey: ["/api/user/daily-challenge"],
    enabled: practiceType === PracticeType.DAILY_CHALLENGE && !!user,
  });
  
  // Generate practice exercise based on type and language
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Create a mutation for generating exercises using OpenAI
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
    }
  });
  
  // Generate a random exercise using AI
  const generateExercise = () => {
    setIsGenerating(true);
    setResult(null);
    setUserAnswer("");
    
    if (!selectedLanguage) {
      setIsGenerating(false);
      return;
    }
    
    // Get language info
    const languageId = parseInt(selectedLanguage);
    const language = userLanguages && Array.isArray(userLanguages) 
      ? userLanguages.find((ul: UserLanguage & {language: Language}) => ul.languageId === languageId)?.language
      : undefined;
    
    if (!language) {
      setIsGenerating(false);
      return;
    }
    
    // Map practice type to exercise type
    const exerciseType = practiceType === PracticeType.VOCABULARY 
      ? "multiple-choice" 
      : "translation";
    
    // Make API call to generate exercise with OpenAI
    generateExerciseMutation.mutate({
      language: language.name,
      type: practiceType.toLowerCase(),
    });
  };
  
  // Create a mutation for checking translation answers
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

  // Handle check answer
  const handleCheckAnswer = () => {
    if (!currentExercise || !userAnswer) return;
    
    setIsChecking(true);
    
    // Get language info
    const languageId = parseInt(selectedLanguage);
    const language = userLanguages && Array.isArray(userLanguages) 
      ? userLanguages.find((ul: UserLanguage & {language: Language}) => ul.languageId === languageId)?.language
      : undefined;
    
    // For translation exercises, use AI to check the answer
    if (currentExercise.type === "translation" && language && practiceType !== PracticeType.DAILY_CHALLENGE) {
      checkTranslationMutation.mutate({
        original: currentExercise.question,
        translation: userAnswer,
        language: language.name,
      });
    } else {
      // For multiple choice or daily challenges, do a direct comparison
      const isCorrect = userAnswer.toLowerCase().trim() === currentExercise.answer.toLowerCase().trim();
      setResult(isCorrect ? "correct" : "incorrect");
      
      toast({
        title: isCorrect ? "Correct!" : "Not quite right",
        description: isCorrect 
          ? "Great job! You're making progress." 
          : `The correct answer is: ${currentExercise.answer}`,
        variant: isCorrect ? "default" : "destructive",
      });
      
      setIsChecking(false);
    }
  };
  
  // Reset exercise
  const handleReset = () => {
    setResult(null);
    setUserAnswer("");
    generateExercise();
  };
  
  // Initialize exercise when language is selected
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    if (value && practiceType !== PracticeType.DAILY_CHALLENGE) {
      generateExercise();
    }
  };
  
  // Switch practice type
  const handlePracticeTypeChange = (value: string) => {
    setPracticeType(value as PracticeType);
    setResult(null);
    setUserAnswer("");
    
    if (value !== PracticeType.DAILY_CHALLENGE && selectedLanguage) {
      generateExercise();
    }
  };
  
  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Practice</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Reinforce your language skills with targeted practice exercises
        </p>
      </div>
      
      <div className="mb-6">
        <Tabs 
          value={practiceType} 
          onValueChange={handlePracticeTypeChange}
          className="w-full"
        >
          <TabsList className="mb-6 grid grid-cols-2 md:grid-cols-4">
            <TabsTrigger value={PracticeType.DAILY_CHALLENGE}>Daily Challenge</TabsTrigger>
            <TabsTrigger value={PracticeType.VOCABULARY}>Vocabulary</TabsTrigger>
            <TabsTrigger value={PracticeType.GRAMMAR}>Grammar</TabsTrigger>
            <TabsTrigger value={PracticeType.CONVERSATION}>Conversation</TabsTrigger>
          </TabsList>
          
          {practiceType !== PracticeType.DAILY_CHALLENGE && (
            <div className="mb-6 w-full md:w-64">
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingLanguages ? (
                    <SelectItem value="loading" disabled>Loading languages...</SelectItem>
                  ) : userLanguages && Array.isArray(userLanguages) ? userLanguages.map((userLanguage: UserLanguage & {language: Language}) => (
                    <SelectItem 
                      key={userLanguage.languageId} 
                      value={userLanguage.languageId.toString()}
                    >
                      {userLanguage.language.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <TabsContent value={PracticeType.DAILY_CHALLENGE}>
            {isLoadingChallenge ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : dailyChallenge ? (
              <Card>
                <CardHeader>
                  <CardTitle>Daily Challenge</CardTitle>
                  <CardDescription>
                    Complete today's challenge to maintain your streak
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyChallenge && dailyChallenge.isCompleted ? (
                    <div className="text-center py-6">
                      <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Challenge Completed!</h3>
                      <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                        You've already completed today's challenge. Come back tomorrow for a new one!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">
                          {dailyChallenge && dailyChallenge.challenge && dailyChallenge.challenge.prompt}</h3>
                        
                        <div className="space-y-4">
                          <Input
                            placeholder="Type your answer here..."
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            className="w-full"
                          />
                          
                          <div className="flex justify-between">
                            <Button variant="outline" className="flex items-center">
                              <Mic className="h-4 w-4 mr-2" />
                              Voice Input
                            </Button>
                            
                            <Button 
                              onClick={handleCheckAnswer} 
                              disabled={!userAnswer || isChecking}
                              className="bg-primary hover:bg-primary-hover"
                            >
                              {isChecking && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Check Answer
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {result && (
                        <div className={`p-4 rounded-lg mb-4 ${
                          result === "correct" 
                            ? "bg-green-100 dark:bg-green-900/30" 
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}>
                          <div className="flex items-center">
                            {result === "correct" ? (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                            )}
                            <p className={result === "correct" 
                              ? "text-green-700 dark:text-green-400" 
                              : "text-red-700 dark:text-red-400"
                            }>
                              {result === "correct" 
                                ? "Correct! Great job!" 
                                : `Incorrect. The correct answer is: ${dailyChallenge && dailyChallenge.challenge ? dailyChallenge.challenge.answer : ''}`
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-6">
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      No daily challenge available. Start learning a language to get daily challenges.
                    </p>
                    <Button>Start Learning</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value={PracticeType.VOCABULARY}>
            {!selectedLanguage ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-6">
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Select a language to practice vocabulary
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : isGenerating ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : currentExercise ? (
              <Card>
                <CardHeader>
                  <CardTitle>Vocabulary Practice</CardTitle>
                  <CardDescription>
                    Expand your vocabulary with these exercises
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">{currentExercise.question}</h3>
                    
                    {currentExercise.type === "multiple-choice" && (
                      <RadioGroup
                        value={userAnswer}
                        onValueChange={setUserAnswer}
                        className="space-y-3"
                      >
                        {currentExercise.options?.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="text-base">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    
                    {currentExercise.type === "translation" && (
                      <Input
                        placeholder="Type your answer here..."
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="w-full mb-4"
                      />
                    )}
                  </div>
                  
                  {result ? (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${
                        result === "correct" 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        <div className="flex items-center">
                          {result === "correct" ? (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                          )}
                          <p className={result === "correct" 
                            ? "text-green-700 dark:text-green-400" 
                            : "text-red-700 dark:text-red-400"
                          }>
                            {result === "correct" 
                              ? "Correct! Great job!" 
                              : `Incorrect. The correct answer is: ${currentExercise.answer}`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleReset}
                        className="w-full"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Try Another Exercise
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleCheckAnswer} 
                      disabled={!userAnswer || isChecking}
                      className="w-full bg-primary hover:bg-primary-hover"
                    >
                      {isChecking && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Check Answer
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
          
          <TabsContent value={PracticeType.GRAMMAR}>
            {!selectedLanguage ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-6">
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Select a language to practice grammar
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : isGenerating ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : currentExercise ? (
              <Card>
                <CardHeader>
                  <CardTitle>Grammar Practice</CardTitle>
                  <CardDescription>
                    Master the rules of your target language
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">{currentExercise.question}</h3>
                    
                    <Input
                      placeholder="Type your answer here..."
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-full mb-4"
                    />
                  </div>
                  
                  {result ? (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${
                        result === "correct" 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        <div className="flex items-center">
                          {result === "correct" ? (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                          )}
                          <p className={result === "correct" 
                            ? "text-green-700 dark:text-green-400" 
                            : "text-red-700 dark:text-red-400"
                          }>
                            {result === "correct" 
                              ? "Correct! Great job!" 
                              : `Incorrect. The correct answer is: ${currentExercise.answer}`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleReset}
                        className="w-full"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Try Another Exercise
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleCheckAnswer} 
                      disabled={!userAnswer || isChecking}
                      className="w-full bg-primary hover:bg-primary-hover"
                    >
                      {isChecking && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Check Answer
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
          
          <TabsContent value={PracticeType.CONVERSATION}>
            {!selectedLanguage ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-6">
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Select a language to practice conversation skills
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : isGenerating ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : currentExercise ? (
              <Card>
                <CardHeader>
                  <CardTitle>Conversation Practice</CardTitle>
                  <CardDescription>
                    Improve your speaking and listening skills
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">{currentExercise.question}</h3>
                    
                    <div className="space-y-4">
                      <Input
                        placeholder="Type your answer here..."
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="w-full"
                      />
                      
                      <Button variant="outline" className="flex items-center">
                        <Mic className="h-4 w-4 mr-2" />
                        Voice Input
                      </Button>
                    </div>
                  </div>
                  
                  {result ? (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${
                        result === "correct" 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        <div className="flex items-center">
                          {result === "correct" ? (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                          )}
                          <p className={result === "correct" 
                            ? "text-green-700 dark:text-green-400" 
                            : "text-red-700 dark:text-red-400"
                          }>
                            {result === "correct" 
                              ? "Correct! Great job!" 
                              : `Incorrect. The correct answer is: ${currentExercise.answer}`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleReset}
                        className="w-full"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Try Another Exercise
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleCheckAnswer} 
                      disabled={!userAnswer || isChecking}
                      className="w-full bg-primary hover:bg-primary-hover"
                    >
                      {isChecking && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Check Answer
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Learning Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <div className="mr-2 text-primary">•</div>
                <p className="text-sm">Practice a little bit every day rather than cramming.</p>
              </li>
              <li className="flex items-start">
                <div className="mr-2 text-primary">•</div>
                <p className="text-sm">Listen to native speakers to improve your pronunciation.</p>
              </li>
              <li className="flex items-start">
                <div className="mr-2 text-primary">•</div>
                <p className="text-sm">Try to think in your target language as you go about your day.</p>
              </li>
              <li className="flex items-start">
                <div className="mr-2 text-primary">•</div>
                <p className="text-sm">Label objects in your home with vocabulary words.</p>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Daily Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Complete 1 lesson</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Completed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Earn 30 XP</span>
                <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400">
                  10/30 XP
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Practice vocabulary</span>
                <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400">
                  Pending
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                You've made significant progress in your language learning journey!
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Lessons completed</span>
                  <span className="font-semibold">12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Practice sessions</span>
                  <span className="font-semibold">28</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Current streak</span>
                  <span className="font-semibold">{user?.streak || 0} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total XP earned</span>
                  <span className="font-semibold">{user?.xp || 0} XP</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
