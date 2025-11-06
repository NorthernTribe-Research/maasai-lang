import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Send, 
  Loader2, 
  Brain, 
  TrendingUp, 
  Target, 
  Sparkles,
  CheckCircle,
  XCircle,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: string;
  isCorrect?: boolean;
  accuracy?: number;
}

interface Session {
  sessionId: string;
  sessionType: string;
  topic: string;
  difficulty: string;
  learningObjectives: string[];
  aiTeacherPersona: string;
  estimatedDuration: number;
}

export default function AITeacherPage() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(10);
  const [overallProgress, setOverallProgress] = useState(0);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user languages and profile
  const { data: userLanguages = [] } = useQuery<any[]>({
    queryKey: ['/api/user/languages']
  });

  const selectedLanguage = userLanguages.find(ul => ul.isActive) || userLanguages[0];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start a new AI learning session
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLanguage) throw new Error('No language selected');

      const userProfile = {
        skillLevels: {
          vocabulary: 50,
          grammar: 50,
          speaking: 50,
          listening: 50
        },
        masteredConcepts: [],
        strugglingConcepts: [],
        interests: ['daily conversation', 'travel'],
        goals: ['conversational fluency'],
        recentPerformance: []
      };

      return apiRequest('POST', '/api/ai-learning/session/start', {
        languageId: selectedLanguage.languageId,
        languageName: selectedLanguage.language.name,
        userProfile,
        preferences: {}
      });
    },
    onSuccess: (data: any) => {
      setActiveSession(data);
      setMessages([{
        role: 'assistant',
        content: data.initialMessage,
        timestamp: new Date()
      }]);
      setTotalSteps(10);
      setCurrentStep(0);
      setOverallProgress(0);

      toast({
        title: "Session Started!",
        description: `Learning ${data.topic} with AI teacher`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start session",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send message to AI teacher
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!activeSession) throw new Error('No active session');

      return apiRequest('POST', `/api/ai-learning/session/${activeSession.sessionId}/message`, {
        message
      });
    },
    onSuccess: (data: any) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.aiResponse,
          timestamp: new Date(),
          feedback: data.feedback,
          isCorrect: data.isCorrect,
          accuracy: data.accuracy
        }
      ]);

      setCurrentStep(data.progressUpdate.currentStep);
      setTotalSteps(data.progressUpdate.totalSteps);
      setOverallProgress(data.progressUpdate.overallProgress);

      if (data.nextAction === 'complete') {
        completeSessionMutation.mutate();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Message failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error('No active session');
      return apiRequest('POST', `/api/ai-learning/session/${activeSession.sessionId}/complete`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Session Complete!",
        description: `You earned ${data.summary.xpEarned} XP!`,
      });
      setActiveSession(null);
      setMessages([]);
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !activeSession) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessageMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedLanguage) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Language Selected</CardTitle>
            <CardDescription>Please select a language to start learning with AI</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-ai-teacher-title">
          <Bot className="h-8 w-8" />
          AI Language Teacher
        </h1>
        <p className="text-muted-foreground mt-2">
          Learn {selectedLanguage.language.name} through personalized AI-powered conversations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main conversation area */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col" data-testid="card-conversation">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    {activeSession ? activeSession.topic : 'Ready to Learn'}
                  </CardTitle>
                  {activeSession && (
                    <CardDescription className="mt-1">
                      <Badge variant="outline">{activeSession.difficulty}</Badge>
                      <span className="ml-2">{activeSession.sessionType}</span>
                    </CardDescription>
                  )}
                </div>
                {activeSession && (
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Progress: {Math.round(overallProgress)}%
                    </div>
                    <Progress value={overallProgress} className="w-32 mt-1" />
                  </div>
                )}
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="flex-1 overflow-hidden p-4">
              {!activeSession ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Sparkles className="h-16 w-16 text-muted-foreground" />
                  <h3 className="text-xl font-semibold">Start Your AI Learning Journey</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Click the button below to start a personalized learning session. 
                    The AI will determine the best topic and activity for you right now.
                  </p>
                  <Button 
                    onClick={() => startSessionMutation.mutate()}
                    disabled={startSessionMutation.isPending}
                    size="lg"
                    data-testid="button-start-session"
                  >
                    {startSessionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Start AI Session
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${message.role}-${index}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === 'assistant' && <Bot className="h-5 w-5 mt-1 flex-shrink-0" />}
                            <div className="flex-1">
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              
                              {message.feedback && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    {message.isCorrect ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-yellow-500" />
                                    )}
                                    <span className="text-sm font-medium">
                                      {message.accuracy !== undefined && `${Math.round(message.accuracy)}% accuracy`}
                                    </span>
                                  </div>
                                  <p className="text-sm opacity-90">{message.feedback}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs opacity-60 mt-2">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {sendMessageMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-4">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              )}
            </CardContent>

            {activeSession && (
              <>
                <Separator />
                <CardFooter className="p-4">
                  <div className="flex w-full gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your response..."
                      className="flex-1 min-h-[60px] resize-none"
                      disabled={sendMessageMutation.isPending}
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                      size="icon"
                      className="h-[60px] w-[60px]"
                      data-testid="button-send"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </CardFooter>
              </>
            )}
          </Card>
        </div>

        {/* Side panel - Learning objectives and stats */}
        <div className="space-y-4">
          {activeSession && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Learning Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {activeSession.learningObjectives.map((objective, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Session Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{currentStep}/{totalSteps}</span>
                    </div>
                    <Progress value={overallProgress} />
                  </div>
                  <Separator />
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Topic:</span>
                      <span className="font-medium">{activeSession.topic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Difficulty:</span>
                      <Badge variant="outline">{activeSession.difficulty}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{activeSession.sessionType}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => completeSessionMutation.mutate()}
                disabled={completeSessionMutation.isPending}
                data-testid="button-complete-session"
              >
                {completeSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  'Complete Session'
                )}
              </Button>
            </>
          )}

          {!activeSession && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </div>
                  <p>AI analyzes your learning profile and determines the best topic for you</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </div>
                  <p>Engage in natural conversation with your AI teacher</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </div>
                  <p>Receive real-time feedback and adaptive content</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    4
                  </div>
                  <p>Track your progress and earn XP as you learn</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
