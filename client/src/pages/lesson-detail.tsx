import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import AILanguageTeacher from "@/components/common/ai-language-teacher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, CheckCircle, XCircle, MessageCircle, Book } from "lucide-react";

enum ExerciseType {
  MULTIPLE_CHOICE = "multiple-choice",
  TRANSLATION = "translation",
  MATCHING = "matching",
}

interface Exercise {
  id: number;
  type: ExerciseType;
  prompt: string;
  answer: string;
  options?: string[];
}

// Generate exercises based on lesson type
const generateExercises = (lesson: any, count: number = 5): Exercise[] => {
  const exercises: Exercise[] = [];
  
  // Vocabulary lesson exercises
  if (lesson.type === "vocabulary") {
    exercises.push(
      {
        id: 1,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "What is the translation of 'hello'?",
        answer: lesson.languageId === 1 ? "hola" : "你好",
        options: lesson.languageId === 1 
          ? ["hola", "adiós", "gracias", "por favor"] 
          : ["你好", "再见", "谢谢", "请"],
      },
      {
        id: 2,
        type: ExerciseType.TRANSLATION,
        prompt: "Translate 'I would like to order a coffee, please.'",
        answer: lesson.languageId === 1 
          ? "Me gustaría pedir un café, por favor." 
          : "我想点一杯咖啡，谢谢。",
      },
      {
        id: 3,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "Choose the correct word for 'food'",
        answer: lesson.languageId === 1 ? "comida" : "食物",
        options: lesson.languageId === 1 
          ? ["comida", "bebida", "mesa", "plato"] 
          : ["食物", "饮料", "桌子", "盘子"],
      },
      {
        id: 4,
        type: ExerciseType.TRANSLATION,
        prompt: "Translate 'Good morning, how are you?'",
        answer: lesson.languageId === 1 
          ? "Buenos días, ¿cómo estás?" 
          : "早上好，你好吗？",
      },
      {
        id: 5,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "What is the word for 'thank you'?",
        answer: lesson.languageId === 1 ? "gracias" : "谢谢",
        options: lesson.languageId === 1 
          ? ["gracias", "por favor", "de nada", "perdón"] 
          : ["谢谢", "请", "不客气", "对不起"],
      }
    );
  }
  
  // Grammar lesson exercises
  else if (lesson.type === "grammar") {
    exercises.push(
      {
        id: 1,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "Choose the correct verb form: 'He ___ to the store.'",
        answer: lesson.languageId === 1 ? "va" : "去",
        options: lesson.languageId === 1 
          ? ["va", "vas", "voy", "van"] 
          : ["去", "去了", "去着", "去过"],
      },
      {
        id: 2,
        type: ExerciseType.TRANSLATION,
        prompt: "Translate 'I am eating dinner.'",
        answer: lesson.languageId === 1 
          ? "Estoy comiendo la cena." 
          : "我在吃晚饭。",
      },
      {
        id: 3,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "Select the correct past tense form: 'Yesterday, I ___ to the park.'",
        answer: lesson.languageId === 1 ? "fui" : "去了",
        options: lesson.languageId === 1 
          ? ["fui", "fue", "fuiste", "fueron"] 
          : ["去了", "去", "去过", "去着"],
      },
      {
        id: 4,
        type: ExerciseType.TRANSLATION,
        prompt: "Translate 'They will arrive tomorrow.'",
        answer: lesson.languageId === 1 
          ? "Ellos llegarán mañana." 
          : "他们明天会到达。",
      },
      {
        id: 5,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "Choose the correct article: '___ casa es grande.'",
        answer: lesson.languageId === 1 ? "La" : "这个",
        options: lesson.languageId === 1 
          ? ["La", "El", "Los", "Las"] 
          : ["这个", "那个", "一个", "些"],
      }
    );
  }
  
  // Conversation lesson exercises
  else {
    exercises.push(
      {
        id: 1,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "How would you ask for the check in a restaurant?",
        answer: lesson.languageId === 1 ? "La cuenta, por favor." : "买单，谢谢。",
        options: lesson.languageId === 1 
          ? ["La cuenta, por favor.", "Más comida, por favor.", "¿Dónde está el baño?", "¿Cuánto cuesta?"] 
          : ["买单，谢谢。", "再来点菜，谢谢。", "洗手间在哪里？", "多少钱？"],
      },
      {
        id: 2,
        type: ExerciseType.TRANSLATION,
        prompt: "Translate 'Could I have a glass of water, please?'",
        answer: lesson.languageId === 1 
          ? "¿Podría tener un vaso de agua, por favor?" 
          : "请给我一杯水好吗？",
      },
      {
        id: 3,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "What's the appropriate response to 'How are you?'",
        answer: lesson.languageId === 1 ? "Estoy bien, gracias." : "我很好，谢谢。",
        options: lesson.languageId === 1 
          ? ["Estoy bien, gracias.", "Me llamo Juan.", "Encantado de conocerte.", "Hasta luego."] 
          : ["我很好，谢谢。", "我叫王。", "很高兴认识你。", "再见。"],
      },
      {
        id: 4,
        type: ExerciseType.TRANSLATION,
        prompt: "Translate 'Nice to meet you!'",
        answer: lesson.languageId === 1 
          ? "¡Encantado de conocerte!" 
          : "很高兴认识你！",
      },
      {
        id: 5,
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: "How do you say 'goodbye' formally?",
        answer: lesson.languageId === 1 ? "Adiós." : "再见。",
        options: lesson.languageId === 1 
          ? ["Adiós.", "Hola.", "Buenos días.", "Gracias."] 
          : ["再见。", "你好。", "早上好。", "谢谢。"],
      }
    );
  }
  
  return exercises.slice(0, count);
};

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [progress, setProgress] = useState(0);
  
  // Fetch lesson details
  const { 
    data: lessonDetail,
    isLoading: isLoadingLesson 
  } = useQuery({
    queryKey: ["/api/languages", 0, "lessons"],
    enabled: !!id,
    select: (data) => data?.find((lesson: any) => lesson.id === parseInt(id))
  });
  
  // Fetch user lesson progress if it exists
  const { 
    data: userLesson,
    isLoading: isLoadingUserLesson 
  } = useQuery({
    queryKey: ["/api/user/languages", 0, "lessons"],
    enabled: !!id && !!user,
    select: (data) => data?.find((lesson: any) => lesson.lessonId === parseInt(id))
  });
  
  // Start lesson mutation
  const startLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      const res = await apiRequest("POST", "/api/user/lessons", { lessonId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/languages"] });
    },
  });
  
  // Complete lesson mutation
  const completeLessonMutation = useMutation({
    mutationFn: async ({ lessonId, progress }: { lessonId: number, progress: number }) => {
      const res = await apiRequest("PUT", `/api/user/lessons/${lessonId}/complete`, { progress });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/languages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Lesson completed!",
        description: `You've earned XP and made progress in your language journey.`,
      });
      
      // Wait a bit before redirecting
      setTimeout(() => {
        navigate("/lessons");
      }, 2000);
    },
  });
  
  // Initialize exercises when lesson is loaded
  useEffect(() => {
    if (lessonDetail) {
      setExercises(generateExercises(lessonDetail, 5));
      
      // Start the lesson
      if (user && !startLessonMutation.isPending) {
        startLessonMutation.mutate(parseInt(id));
      }
    }
  }, [lessonDetail, id, user]);
  
  // Update progress as user advances
  useEffect(() => {
    if (exercises.length > 0) {
      setProgress(Math.floor((currentExercise / exercises.length) * 100));
    }
  }, [currentExercise, exercises.length]);
  
  const handleAnswerChange = (value: string) => {
    setUserAnswers({
      ...userAnswers,
      [currentExercise]: value
    });
  };
  
  const handleNextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
    } else {
      // Show results when all exercises are completed
      setShowResults(true);
      
      // Calculate score as percentage
      const correctAnswers = exercises.filter(
        (exercise, index) => userAnswers[index]?.toLowerCase().trim() === exercise.answer.toLowerCase().trim()
      ).length;
      
      const scorePercentage = Math.floor((correctAnswers / exercises.length) * 100);
      
      // Complete the lesson
      if (user && !completeLessonMutation.isPending) {
        completeLessonMutation.mutate({
          lessonId: parseInt(id),
          progress: scorePercentage
        });
      }
    }
  };
  
  const isCurrentAnswerCorrect = () => {
    const currentEx = exercises[currentExercise];
    return currentEx && userAnswers[currentExercise]?.toLowerCase().trim() === currentEx.answer.toLowerCase().trim();
  };
  
  const calculateScore = () => {
    if (!exercises.length) return 0;
    
    const correctAnswers = exercises.filter(
      (exercise, index) => userAnswers[index]?.toLowerCase().trim() === exercise.answer.toLowerCase().trim()
    ).length;
    
    return correctAnswers;
  };
  
  if (isLoadingLesson) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  if (!lessonDetail) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Lesson not found</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Sorry, the lesson you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/lessons">
            <Button>Return to Lessons</Button>
          </Link>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="mb-6 flex items-center">
        <Link href="/lessons">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold">{lessonDetail.title}</h2>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {showResults ? "Lesson completed" : `Exercise ${currentExercise + 1} of ${exercises.length}`}
          </span>
          <span className="text-sm font-medium">
            {progress}% complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {!showResults ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            {exercises.length > 0 && exercises[currentExercise] && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">{exercises[currentExercise].prompt}</h3>
                  
                  {exercises[currentExercise].type === ExerciseType.MULTIPLE_CHOICE && (
                    <RadioGroup
                      value={userAnswers[currentExercise] || ""}
                      onValueChange={handleAnswerChange}
                      className="space-y-3"
                    >
                      {exercises[currentExercise].options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="text-base">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  
                  {exercises[currentExercise].type === ExerciseType.TRANSLATION && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Type your translation here..."
                        value={userAnswers[currentExercise] || ""}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={handleNextExercise}
                    disabled={!userAnswers[currentExercise]}
                    className="bg-primary hover:bg-primary-hover"
                  >
                    {currentExercise < exercises.length - 1 ? "Next" : "Finish Lesson"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <div className="mb-4">
                {calculateScore() >= Math.ceil(exercises.length / 2) ? (
                  <CheckCircle className="h-16 w-16 text-primary mx-auto" />
                ) : (
                  <XCircle className="h-16 w-16 text-accent mx-auto" />
                )}
              </div>
              
              <h3 className="text-2xl font-bold mb-2">
                {calculateScore() >= Math.ceil(exercises.length / 2) 
                  ? "Great job!" 
                  : "Keep practicing!"}
              </h3>
              
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                You got {calculateScore()} out of {exercises.length} correct.
              </p>
              
              {completeLessonMutation.isPending ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span>Saving your progress...</span>
                </div>
              ) : (
                <div>
                  <p className="text-green-600 dark:text-green-400 font-medium mb-6">
                    Your progress has been saved!
                  </p>
                  
                  <div className="flex justify-center space-x-4">
                    <Link href={`/lessons/${id}`}>
                      <Button variant="outline">Try Again</Button>
                    </Link>
                    <Link href="/lessons">
                      <Button className="bg-primary hover:bg-primary-hover">
                        Back to Lessons
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="info" className="flex items-center gap-1">
            <Book className="h-4 w-4" />
            Lesson Info
          </TabsTrigger>
          <TabsTrigger value="teacher" className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            AI Teacher
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="mt-0">
          <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4">
            <h3 className="font-semibold mb-2">Lesson Information</h3>
            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <p>
                <span className="font-medium">Type:</span> {lessonDetail.type.charAt(0).toUpperCase() + lessonDetail.type.slice(1)}
              </p>
              <p>
                <span className="font-medium">Duration:</span> Approximately {lessonDetail.duration} minutes
              </p>
              <p>
                <span className="font-medium">XP Reward:</span> {lessonDetail.xpReward} XP
              </p>
              <p>
                <span className="font-medium">Description:</span> {lessonDetail.description}
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="teacher" className="mt-0">
          {user ? (
            <AILanguageTeacher 
              language={{
                id: lessonDetail.languageId,
                name: lessonDetail.language?.name || "Unknown",
                code: lessonDetail.language?.code || "us",
                flag: lessonDetail.language?.flag || ""
              }}
              lessonId={parseInt(id)}
            />
          ) : (
            <Card className="w-full p-6 text-center">
              <p className="mb-4">Please sign in to access the AI language teacher.</p>
              <Link href="/auth">
                <Button>Sign In</Button>
              </Link>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
