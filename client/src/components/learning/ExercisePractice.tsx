import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Lightbulb, Loader2, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ExercisePracticeProps {
  exercises: Exercise[];
  profileId: string;
  onComplete?: (totalXP: number, accuracy: number) => void;
}

interface Exercise {
  id: string;
  type: 'translation' | 'fill-in-blank' | 'multiple-choice' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
}

interface ExerciseResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  feedback: string;
  xpAwarded: number;
}

export default function ExercisePractice({ exercises, profileId, onComplete }: ExercisePracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [completedExercises, setCompletedExercises] = useState<boolean[]>(new Array(exercises.length).fill(false));
  const [correctCount, setCorrectCount] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [startTime] = useState(Date.now());
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const { toast } = useToast();

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + (result ? 1 : 0)) / exercises.length) * 100;
  
  // Reset exercise start time when moving to next exercise
  useEffect(() => {
    setExerciseStartTime(Date.now());
  }, [currentIndex]);

  // Submit exercise answer
  const submitAnswerMutation = useMutation({
    mutationFn: async () => {
      const timeTaken = Math.floor((Date.now() - exerciseStartTime) / 1000);
      
      const response = await apiRequest('POST', '/api/exercises/submit', {
        exerciseId: currentExercise.id,
        profileId,
        userAnswer,
        timeTaken
      });

      return response.json() as Promise<ExerciseResult>;
    },
    onSuccess: (data: ExerciseResult) => {
      setResult(data);
      setTotalXP(prev => prev + data.xpAwarded);
      
      if (data.isCorrect) {
        setCorrectCount(prev => prev + 1);
        const newCompleted = [...completedExercises];
        newCompleted[currentIndex] = true;
        setCompletedExercises(newCompleted);
      }

      // Enhanced toast notifications
      toast({
        title: data.isCorrect ? '✅ Correct!' : '❌ Incorrect',
        description: data.isCorrect 
          ? `+${data.xpAwarded} XP earned!` 
          : 'Review the explanation below',
        variant: data.isCorrect ? 'default' : 'destructive'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = () => {
    if (!userAnswer.trim()) {
      toast({
        title: 'Answer required',
        description: 'Please provide an answer before submitting',
        variant: 'destructive'
      });
      return;
    }
    submitAnswerMutation.mutate();
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setResult(null);
    } else {
      // All exercises completed
      const accuracy = (correctCount / exercises.length) * 100;
      onComplete?.(totalXP, accuracy);
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement) return;
      
      // Space or Enter to continue after seeing result
      if (result && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [result, currentIndex, exercises.length]);

  const renderExerciseInput = () => {
    switch (currentExercise.type) {
      case 'multiple-choice':
        return (
          <RadioGroup value={userAnswer} onValueChange={setUserAnswer} disabled={!!result}>
            <div className="space-y-3">
              {currentExercise.options?.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary ${
                    userAnswer === option ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} className="h-5 w-5" />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1 text-base font-medium">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'translation':
      case 'fill-in-blank':
        return (
          <Input
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer here..."
            disabled={!!result}
            className="text-lg p-6 border-2 focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !result && userAnswer.trim()) {
                handleSubmit();
              }
            }}
            autoFocus
          />
        );

      default:
        return (
          <Input
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer here..."
            disabled={!!result}
            className="text-lg p-6 border-2"
            autoFocus
          />
        );
    }
  };

  if (!currentExercise) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No exercises available
        </CardContent>
      </Card>
    );
  }

  const isLastExercise = currentIndex === exercises.length - 1;

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Exercise Practice</CardTitle>
              <CardDescription className="text-base mt-1">
                Question {currentIndex + 1} of {exercises.length}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                {correctCount}/{currentIndex + (result ? 1 : 0)} ✓
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                {totalXP} XP
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Progress</span>
              <span className="font-bold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full h-3" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="capitalize text-sm">
              {currentExercise.type.replace('-', ' ')}
            </Badge>
            <Badge variant={currentExercise.difficulty > 7 ? 'destructive' : currentExercise.difficulty > 4 ? 'default' : 'secondary'}>
              Level {currentExercise.difficulty}/10
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="animate-in fade-in slide-in-from-top duration-300">
            <h3 className="text-xl font-bold mb-6 leading-relaxed">{currentExercise.question}</h3>
            {renderExerciseInput()}
          </div>

          {!result ? (
            <Button
              className="w-full shadow-md hover:shadow-lg transition-all"
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || submitAnswerMutation.isPending}
              size="lg"
            >
              {submitAnswerMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                '✓ Check Answer'
              )}
            </Button>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
              <Card className={`${result.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'} border-2 shadow-md`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 animate-in zoom-in duration-300" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 animate-in zoom-in duration-300" />
                    )}
                    <div className="flex-1 space-y-2">
                      <p className="font-bold text-lg">
                        {result.isCorrect ? '🎉 Correct!' : '💭 Not quite'}
                      </p>
                      <p className="text-sm">{result.feedback}</p>
                      {!result.isCorrect && (
                        <div className="mt-3 p-3 bg-background rounded-lg border">
                          <p className="text-xs font-semibold mb-1 text-muted-foreground">Correct answer:</p>
                          <p className="text-sm font-medium">{result.correctAnswer}</p>
                        </div>
                      )}
                      {result.isCorrect && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                            +{result.xpAwarded} XP
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-2">💡 Explanation</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full shadow-md hover:shadow-lg transition-all"
                onClick={handleNext}
                size="lg"
              >
                {isLastExercise ? (
                  '🏁 Complete Practice'
                ) : (
                  <>
                    Next Exercise
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {isLastExercise 
                  ? `Practice complete! Final score: ${correctCount}/${exercises.length}`
                  : `${exercises.length - currentIndex - 1} exercises remaining`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
