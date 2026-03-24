import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Activity, BarChart3, Brain, Mic, Users, Zap } from 'lucide-react';

interface AnalyticsData {
  strengths: string[];
  weaknesses: string[];
  recommendedFocus: string[];
  progressMetrics: {
    vocabulary: number;
    grammar: number;
    pronunciation: number;
    fluency: number;
  };
  nextMilestones: string[];
}

interface PersonalizedCurriculum {
  learnerProfile: {
    level: string;
    interests: string[];
    learningStyle: string;
    goals: string[];
  };
  adaptedLessons: Array<{
    title: string;
    difficulty: number;
    estimatedTime: number;
    prerequisites: string[];
    outcomes: string[];
  }>;
  progressionPath: string[];
}

export default function ResearchDashboard() {
  const [selectedLanguage, setSelectedLanguage] = useState('Spanish');
  const [testSession, setTestSession] = useState({
    responses: [
      { question: 'What is "hello" in Spanish?', userAnswer: 'hola', correctAnswer: 'hola', type: 'vocabulary', timeSpent: 5 },
      { question: 'Conjugate "ser" in present tense', userAnswer: 'soy', correctAnswer: 'soy', type: 'grammar', timeSpent: 8 }
    ]
  });
  const [learnerProfile, setLearnerProfile] = useState({
    level: 'intermediate',
    interests: ['travel', 'business'],
    goals: ['conversation', 'professional'],
    learningStyle: 'visual',
    timeAvailable: 5,
    previousExperience: ['basic grammar']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate learning analytics
  const analyticsMutation = useMutation<AnalyticsData>({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai/advanced/analytics', {
        userId: 1,
        languageId: 1,
        recentSessions: [
          { type: 'vocabulary', accuracy: 85, duration: 300, topics: ['colors'], mistakes: ['pronunciation'] },
          { type: 'grammar', accuracy: 75, duration: 450, topics: ['present tense'], mistakes: ['conjugation'] }
        ]
      });
      return res.json() as Promise<AnalyticsData>;
    },
    onSuccess: () => {
      toast({ title: "Analytics generated", description: "Learning insights ready" });
    },
    onError: () => {
      toast({ title: "Analytics failed", description: "Using fallback data", variant: "destructive" });
    }
  });

  // Generate personalized curriculum
  const curriculumMutation = useMutation<PersonalizedCurriculum>({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai/advanced/curriculum', {
        learnerData: learnerProfile,
        targetLanguage: selectedLanguage
      });
      return res.json() as Promise<PersonalizedCurriculum>;
    },
    onSuccess: () => {
      toast({ title: "Curriculum generated", description: "Personalized learning path created" });
    }
  });

  // Real-time assessment
  const assessmentMutation = useMutation<{ accuracy: number; fluency: number; comprehension: number; areas?: Record<string, number>; feedback?: string; recommendations?: string[] }>({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai/advanced/assessment', {
        sessionData: testSession,
        targetLanguage: selectedLanguage.toLowerCase(),
        userLevel: 'intermediate'
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Assessment completed", description: "Performance analysis ready" });
    }
  });

  // Multi-modal lesson generation
  const multiModalMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/ai/advanced/multimodal', {
        topic: 'restaurant ordering',
        targetLanguage: selectedLanguage,
        learningModalities: ['visual', 'auditory', 'interactive'],
        difficulty: 'intermediate'
      });
    },
    onSuccess: () => {
      toast({ title: "Multi-modal lesson created", description: "Interactive content ready" });
    }
  });

  // Test basic AI services
  const testVocabulary = useMutation<any[]>({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai/vocabulary', {
        language: selectedLanguage,
        theme: 'technology',
        level: 'intermediate',
        count: 5
      });
      return res.json();
    }
  });

  const testGrammar = useMutation<{ concept?: string; explanation?: string }>({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai/grammar', {
        language: selectedLanguage,
        topic: 'conditional tense',
        level: 'intermediate'
      });
      return res.json();
    }
  });

  const testVoiceConversation = useMutation<{ initialGreeting?: string }>({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai/voice/conversation/start', {
        languageId: 1,
        topic: 'technology discussion',
        level: 'intermediate'
      });
      return res.json();
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Research Dashboard</h1>
          <p className="text-muted-foreground">
            Advanced language learning AI system testing and analytics
          </p>
        </div>
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Spanish">Spanish</SelectItem>
            <SelectItem value="French">French</SelectItem>
            <SelectItem value="German">German</SelectItem>
            <SelectItem value="Japanese">Japanese</SelectItem>
            <SelectItem value="Chinese">Chinese</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="services">AI Services</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Learning Analytics
              </CardTitle>
              <CardDescription>
                Advanced AI-powered learning performance analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => analyticsMutation.mutate()}
                disabled={analyticsMutation.isPending}
                className="w-full"
              >
                {analyticsMutation.isPending ? 'Generating Analytics...' : 'Generate Learning Analytics'}
              </Button>

              {analyticsMutation.data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">Strengths</h4>
                      <ul className="space-y-1">
                        {analyticsMutation.data.strengths?.map((strength: string, i: number) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-600 mb-2">Areas for Improvement</h4>
                      <ul className="space-y-1">
                        {analyticsMutation.data.weaknesses?.map((weakness: string, i: number) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <div className="h-2 w-2 bg-orange-500 rounded-full" />
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Progress Metrics</h4>
                    {Object.entries(analyticsMutation.data.progressMetrics || {}).map(([skill, score]) => (
                      <div key={skill} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{skill}</span>
                          <span>{score}%</span>
                        </div>
                        <Progress value={score as number} className="h-2" />
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Next Milestones</h4>
                    <div className="flex flex-wrap gap-2">
                      {analyticsMutation.data.nextMilestones?.map((milestone: string, i: number) => (
                        <Badge key={i} variant="outline">{milestone}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Personalized Curriculum Generation
              </CardTitle>
              <CardDescription>
                AI-generated learning paths based on individual profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Interests (comma-separated)</label>
                  <Textarea 
                    value={learnerProfile.interests.join(', ')}
                    onChange={(e) => setLearnerProfile(prev => ({
                      ...prev,
                      interests: e.target.value.split(', ').filter(Boolean)
                    }))}
                    placeholder="travel, business, culture"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Goals (comma-separated)</label>
                  <Textarea 
                    value={learnerProfile.goals.join(', ')}
                    onChange={(e) => setLearnerProfile(prev => ({
                      ...prev,
                      goals: e.target.value.split(', ').filter(Boolean)
                    }))}
                    placeholder="conversation, professional, academic"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button 
                onClick={() => curriculumMutation.mutate()}
                disabled={curriculumMutation.isPending}
                className="w-full"
              >
                {curriculumMutation.isPending ? 'Generating Curriculum...' : 'Generate Personalized Curriculum'}
              </Button>

              {curriculumMutation.data && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Learning Profile</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Level: <Badge>{curriculumMutation.data.learnerProfile.level}</Badge></div>
                      <div>Style: <Badge variant="outline">{curriculumMutation.data.learnerProfile.learningStyle}</Badge></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Adapted Lessons</h4>
                    <ScrollArea className="h-40">
                      <div className="space-y-2">
                        {curriculumMutation.data.adaptedLessons?.map((lesson: any, i: number) => (
                          <div key={i} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-center">
                              <h5 className="font-medium">{lesson.title}</h5>
                              <div className="flex gap-2">
                                <Badge variant="secondary">Difficulty: {lesson.difficulty}</Badge>
                                <Badge variant="outline">{lesson.estimatedTime}min</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Progression Path</h4>
                    <div className="flex flex-wrap gap-2">
                      {curriculumMutation.data.progressionPath?.map((step: string, i: number) => (
                        <Badge key={i} variant="default">{i + 1}. {step}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-time Assessment
              </CardTitle>
              <CardDescription>
                Live performance analysis and adaptive feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => assessmentMutation.mutate()}
                disabled={assessmentMutation.isPending}
                className="w-full"
              >
                {assessmentMutation.isPending ? 'Analyzing Performance...' : 'Run Real-time Assessment'}
              </Button>

              {assessmentMutation.data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {assessmentMutation.data.accuracy}%
                      </div>
                      <div className="text-sm text-muted-foreground">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {assessmentMutation.data.fluency}%
                      </div>
                      <div className="text-sm text-muted-foreground">Fluency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {assessmentMutation.data.comprehension}%
                      </div>
                      <div className="text-sm text-muted-foreground">Comprehension</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Skill Areas</h4>
                    {Object.entries(assessmentMutation.data.areas || {}).map(([area, score]) => (
                      <div key={area} className="flex justify-between items-center">
                        <span className="capitalize">{area}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={score as number} className="w-24 h-2" />
                          <span className="text-sm w-10">{score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">AI Feedback</h4>
                    <p className="text-sm bg-muted p-3 rounded-lg">
                      {assessmentMutation.data.feedback}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {assessmentMutation.data.recommendations?.map((rec: string, i: number) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Content Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => testVocabulary.mutate()}
                  disabled={testVocabulary.isPending}
                  className="w-full"
                  variant="outline"
                >
                  Test Vocabulary Generation
                </Button>
                <Button 
                  onClick={() => testGrammar.mutate()}
                  disabled={testGrammar.isPending}
                  className="w-full"
                  variant="outline"
                >
                  Test Grammar Explanations
                </Button>
                <Button 
                  onClick={() => multiModalMutation.mutate()}
                  disabled={multiModalMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  Generate Multi-modal Lesson
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Voice & Interaction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => testVoiceConversation.mutate()}
                  disabled={testVoiceConversation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  Test Voice Conversation
                </Button>
                <Button 
                  className="w-full"
                  variant="outline"
                  disabled
                >
                  Whisper Pronunciation Test
                </Button>
                <Button 
                  className="w-full"
                  variant="outline"
                  disabled
                >
                  Real-time Speech Analysis
                </Button>
              </CardContent>
            </Card>
          </div>

          {(testVocabulary.data || testGrammar.data || testVoiceConversation.data) && (
            <Card>
              <CardHeader>
                <CardTitle>Service Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-2 text-sm">
                    {testVocabulary.data && (
                      <div>
                        <strong>Vocabulary:</strong> Generated {testVocabulary.data.length} words
                      </div>
                    )}
                    {testGrammar.data && (
                      <div>
                        <strong>Grammar:</strong> {testGrammar.data.concept} - {testGrammar.data.explanation?.substring(0, 100)}...
                      </div>
                    )}
                    {testVoiceConversation.data && (
                      <div>
                        <strong>Voice:</strong> {testVoiceConversation.data.initialGreeting}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}