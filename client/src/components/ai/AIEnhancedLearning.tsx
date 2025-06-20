import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Brain, BookOpen, Mic, Target, TrendingUp, Lightbulb } from 'lucide-react';
import VoiceTeacher from '@/components/voice/VoiceTeacher';
import WhisperPronunciation from '@/components/voice/WhisperPronunciation';

interface AIEnhancedLearningProps {
  languageId: number;
  userId: number;
}

export default function AIEnhancedLearning({ languageId, userId }: AIEnhancedLearningProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [message, setMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate comprehensive lesson
  const generateLessonMutation = useMutation({
    mutationFn: async (data: { topic: string; level: string }) => {
      return apiRequest('POST', '/api/ai/comprehensive-lesson', {
        languageId,
        userId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/lessons'] });
      toast({ title: "Lesson generated successfully!" });
    }
  });

  // Generate personalized exercises
  const generateExercisesMutation = useMutation({
    mutationFn: async (data: { exerciseType: string; count: number }) => {
      return apiRequest('POST', '/api/ai/personalized-exercises', {
        languageId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/exercises'] });
      toast({ title: "Personalized exercises generated!" });
    }
  });

  // Generate learning path
  const generateLearningPathMutation = useMutation({
    mutationFn: async (data: { goals: string[]; timeframe: number }) => {
      return apiRequest('POST', '/api/ai/learning-path', {
        languageId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/learning-path'] });
      toast({ title: "Learning path created!" });
    }
  });

  // AI Teacher chat
  const teacherChatMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('POST', '/api/ai/language-teacher', {
        languageId,
        message,
        history: []
      });
    },
    onSuccess: () => {
      setMessage('');
      toast({ title: "AI Teacher responded!" });
    }
  });

  // Fetch AI insights
  const { data: insights } = useQuery({
    queryKey: ['/api/ai/insights', languageId],
    queryFn: async () => {
      // This would be implemented in the backend
      return {
        strengths: ['Vocabulary building', 'Grammar fundamentals'],
        weaknesses: ['Pronunciation', 'Conversation flow'],
        recommendations: ['Practice speaking daily', 'Focus on phonetics'],
        progress: 75,
        nextMilestone: 'Intermediate level completion'
      };
    }
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AI-Enhanced Learning</h1>
        <p className="text-muted-foreground">
          Personalized language learning powered by advanced AI
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="lessons" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Exercises
          </TabsTrigger>
          <TabsTrigger value="speech" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Speech
          </TabsTrigger>
          <TabsTrigger value="teacher" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Teacher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={insights?.progress || 0} className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  {insights?.progress || 0}% Complete
                </p>
                <p className="text-sm mt-2">
                  Next: {insights?.nextMilestone}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {insights?.strengths?.map((strength, index) => (
                    <Badge key={index} variant="outline" className="text-green-600">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {insights?.weaknesses?.map((weakness, index) => (
                    <Badge key={index} variant="outline" className="text-orange-600">
                      {weakness}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>
                Personalized suggestions based on your learning patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights?.recommendations?.map((rec, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-primary rounded-full" />
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate AI-Powered Lesson</CardTitle>
              <CardDescription>
                Create comprehensive lessons tailored to your learning style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => generateLessonMutation.mutate({
                    topic: 'Travel Conversation',
                    level: 'intermediate'
                  })}
                  disabled={generateLessonMutation.isPending}
                  className="h-20 flex flex-col"
                >
                  <BookOpen className="h-6 w-6 mb-2" />
                  Travel Conversation
                </Button>
                <Button
                  onClick={() => generateLessonMutation.mutate({
                    topic: 'Business Language',
                    level: 'advanced'
                  })}
                  disabled={generateLessonMutation.isPending}
                  className="h-20 flex flex-col"
                >
                  <BookOpen className="h-6 w-6 mb-2" />
                  Business Language
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => generateLearningPathMutation.mutate({
              goals: ['conversational fluency', 'travel preparation'],
              timeframe: 12
            })}
            disabled={generateLearningPathMutation.isPending}
            className="w-full"
          >
            Generate 12-Week Learning Path
          </Button>
        </TabsContent>

        <TabsContent value="exercises" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Exercises</CardTitle>
              <CardDescription>
                AI-generated exercises targeting your specific weaknesses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  onClick={() => generateExercisesMutation.mutate({
                    exerciseType: 'vocabulary',
                    count: 10
                  })}
                  disabled={generateExercisesMutation.isPending}
                  variant="outline"
                >
                  Vocabulary Practice
                </Button>
                <Button
                  onClick={() => generateExercisesMutation.mutate({
                    exerciseType: 'grammar',
                    count: 8
                  })}
                  disabled={generateExercisesMutation.isPending}
                  variant="outline"
                >
                  Grammar Drills
                </Button>
                <Button
                  onClick={() => generateExercisesMutation.mutate({
                    exerciseType: 'translation',
                    count: 5
                  })}
                  disabled={generateExercisesMutation.isPending}
                  variant="outline"
                >
                  Translation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speech" className="space-y-6">
          <div className="space-y-6">
            <VoiceTeacher 
              languageId={languageId}
              topic="General Conversation"
              level="intermediate"
            />
          </div>
        </TabsContent>

        <TabsContent value="teacher" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Language Teacher</CardTitle>
              <CardDescription>
                Chat with your personal AI language tutor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 mb-4 p-4 border rounded">
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded">
                    <p className="text-sm">
                      ¡Hola! I'm your AI Spanish teacher. How can I help you today?
                    </p>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask your AI teacher anything..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => teacherChatMutation.mutate(message)}
                  disabled={!message.trim() || teacherChatMutation.isPending}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}