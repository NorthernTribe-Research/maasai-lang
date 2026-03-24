import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LessonViewer, 
  ExercisePractice, 
  VoiceLesson, 
  PronunciationCoach, 
  AITutor 
} from '@/components/learning';
import { BookOpen, PenTool, Mic, Target, MessageSquare } from 'lucide-react';

export default function LearningDemo() {
  const [activeTab, setActiveTab] = useState('lesson');

  // Mock data for demo
  const mockProfileId = 'demo-profile-id';
  const mockLessonId = 'demo-lesson-id';

  const mockExercises = [
    {
      id: '1',
      type: 'multiple-choice' as const,
      question: 'What is the Spanish word for "hello"?',
      options: ['Hola', 'Adiós', 'Gracias', 'Por favor'],
      correctAnswer: 'Hola',
      explanation: 'Hola is the most common way to say hello in Spanish.',
      difficulty: 3
    },
    {
      id: '2',
      type: 'translation' as const,
      question: 'Translate to Spanish: "Good morning"',
      correctAnswer: 'Buenos días',
      explanation: 'Buenos días is used to greet someone in the morning.',
      difficulty: 4
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Learning Components Demo</h1>
        <p className="text-muted-foreground">
          Interactive learning components for the LinguaMaster platform
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="lesson" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Lesson</span>
          </TabsTrigger>
          <TabsTrigger value="exercise" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">Exercise</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Voice</span>
          </TabsTrigger>
          <TabsTrigger value="pronunciation" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Pronunciation</span>
          </TabsTrigger>
          <TabsTrigger value="tutor" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">AI Tutor</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lesson" className="mt-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Lesson Viewer Component</CardTitle>
              <CardDescription>
                Display vocabulary, grammar, and cultural content with progress tracking
              </CardDescription>
            </CardHeader>
          </Card>
          <LessonViewer
            lessonId={mockLessonId}
            profileId={mockProfileId}
            onComplete={(xp) => console.log('Lesson completed, XP:', xp)}
          />
        </TabsContent>

        <TabsContent value="exercise" className="mt-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Exercise Practice Component</CardTitle>
              <CardDescription>
                Interactive exercises with immediate feedback and explanations
              </CardDescription>
            </CardHeader>
          </Card>
          <ExercisePractice
            exercises={mockExercises}
            profileId={mockProfileId}
            onComplete={(xp, accuracy) => console.log('Exercises completed, XP:', xp, 'Accuracy:', accuracy)}
          />
        </TabsContent>

        <TabsContent value="voice" className="mt-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Voice Lesson Component</CardTitle>
              <CardDescription>
                Voice-based interactive teaching with conversation history
              </CardDescription>
            </CardHeader>
          </Card>
          <VoiceLesson
            profileId={mockProfileId}
            topic="Basic Greetings"
            onComplete={(xp) => console.log('Voice lesson completed, XP:', xp)}
          />
        </TabsContent>

        <TabsContent value="pronunciation" className="mt-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Pronunciation Coach Component</CardTitle>
              <CardDescription>
                AI-powered pronunciation analysis with detailed feedback
              </CardDescription>
            </CardHeader>
          </Card>
          <PronunciationCoach
            targetPhrase="Hola, ¿cómo estás?"
            targetLanguage="Spanish"
            profileId={mockProfileId}
            onComplete={() => console.log('Pronunciation practice completed')}
          />
        </TabsContent>

        <TabsContent value="tutor" className="mt-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>AI Tutor Component</CardTitle>
              <CardDescription>
                24/7 AI language teacher with contextual explanations
              </CardDescription>
            </CardHeader>
          </Card>
          <AITutor
            profileId={mockProfileId}
            context={{
              currentLesson: 'Basic Greetings',
              recentTopics: ['Greetings', 'Introductions']
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
