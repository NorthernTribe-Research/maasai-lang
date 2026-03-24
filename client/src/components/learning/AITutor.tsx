import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { MessageSquare, Send, Loader2, Lightbulb, BookOpen, Sparkles, Globe } from 'lucide-react';

interface AITutorProps {
  profileId: string;
  context?: {
    currentLesson?: string;
    recentTopics?: string[];
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  examples?: string[];
  culturalNotes?: string[];
  etiquetteRules?: string[];
  commonMistakes?: string[];
  relatedConcepts?: string[];
  practiceExercises?: string[];
}

interface TutorResponse {
  answer: string;
  explanation: string;
  examples: string[];
  culturalNotes?: string[];
  etiquetteRules?: string[];
  commonMistakes?: string[];
  relatedConcepts: string[];
  practiceExercises: string[];
  sessionId: string;
}

export default function AITutor({ profileId, context }: AITutorProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get or create session
  const { data: sessionData, error: sessionError } = useQuery({
    queryKey: ['tutor-session', profileId],
    queryFn: async () => {
      const response = await fetch(`/api/tutor/sessions?profileId=${profileId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to get session');
      }
      return response.json();
    },
    enabled: !sessionId
  });

  useEffect(() => {
    if (sessionData?.sessionId) {
      setSessionId(sessionData.sessionId);
    }
  }, [sessionData]);

  // Ask question mutation
  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await fetch('/api/tutor/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          profileId,
          question,
          context: context || {}
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      return response.json();
    },
    onSuccess: (data: TutorResponse) => {
      setSessionId(data.sessionId);
      
      // Add assistant's response
      setConversationHistory(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        examples: data.examples,
        culturalNotes: data.culturalNotes,
        etiquetteRules: data.etiquetteRules,
        commonMistakes: data.commonMistakes,
        relatedConcepts: data.relatedConcepts,
        practiceExercises: data.practiceExercises
      }]);

      setIsTyping(false);
    },
    onError: () => {
      toast({
        title: 'Failed to get response',
        description: 'Please try again',
        variant: 'destructive'
      });
      setIsTyping(false);
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, isTyping]);

  const handleSendMessage = () => {
    if (!inputText.trim()) {
      return;
    }

    // Add user's message
    setConversationHistory(prev => [...prev, {
      role: 'user',
      content: inputText,
      timestamp: new Date()
    }]);

    setIsTyping(true);
    askQuestionMutation.mutate(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "How do I conjugate verbs in the present tense?",
    "What's the difference between ser and estar?",
    "Can you explain the pronunciation of this word?",
    "What are some common greetings?",
    "How do I form questions?"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Language Tutor
          </CardTitle>
          <CardDescription>
            Ask questions about vocabulary, grammar, pronunciation, and culture
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversationHistory.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Your 24/7 AI Language Teacher
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask me anything about your target language!
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Suggested questions:</p>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => {
                        setInputText(question);
                      }}
                    >
                      <Lightbulb className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-96 pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {conversationHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } p-4 rounded-lg space-y-3`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={message.role === 'user' ? 'secondary' : 'default'}>
                          {message.role === 'user' ? 'You' : 'AI Tutor'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {message.examples && message.examples.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Examples:
                          </p>
                          <ul className="space-y-1">
                            {message.examples.map((example, i) => (
                              <li key={i} className="text-xs bg-background/50 p-2 rounded">
                                {example}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {message.culturalNotes && message.culturalNotes.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Globe className="h-3 w-3" />
                            Cultural Context:
                          </p>
                          <ul className="space-y-1">
                            {message.culturalNotes.map((note, i) => (
                              <li key={i} className="text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-800">
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {message.etiquetteRules && message.etiquetteRules.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold flex items-center gap-1 text-green-600 dark:text-green-400">
                            <span className="text-sm">🤝</span>
                            Social Etiquette:
                          </p>
                          <ul className="space-y-1">
                            {message.etiquetteRules.map((rule, i) => (
                              <li key={i} className="text-xs bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800 flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                                {rule}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {message.commonMistakes && message.commonMistakes.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold flex items-center gap-1 text-red-600 dark:text-red-400">
                            <span className="text-sm">⚠️</span>
                            Common Mistakes:
                          </p>
                          <ul className="space-y-1">
                            {message.commonMistakes.map((mistake, i) => (
                              <li key={i} className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800 flex items-start gap-2">
                                <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
                                {mistake}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {message.relatedConcepts && message.relatedConcepts.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold">Related concepts:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.relatedConcepts.map((concept, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {concept}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.practiceExercises && message.practiceExercises.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Practice exercises:
                          </p>
                          <ul className="space-y-1">
                            {message.practiceExercises.map((exercise, i) => (
                              <li key={i} className="text-xs flex items-start gap-2">
                                <span className="text-primary font-bold">{i + 1}.</span>
                                {exercise}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">AI Tutor</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about vocabulary, grammar, pronunciation..."
              disabled={askQuestionMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || askQuestionMutation.isPending}
            >
              {askQuestionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </CardContent>
      </Card>

      {conversationHistory.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {conversationHistory.length} messages in this conversation
              </p>
              <p className="text-xs text-muted-foreground">
                The AI tutor maintains context throughout your session
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
