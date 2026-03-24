import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Mic, MicOff, Volume2, MessageSquare, Loader2, StopCircle } from 'lucide-react';

interface VoiceLessonProps {
  profileId: string;
  topic?: string;
  onComplete?: (xpAwarded: number) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: string;
}

interface VoiceResponse {
  transcript: string;
  response: string;
  corrections?: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  feedback?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export default function VoiceLesson({ profileId, topic, onComplete }: VoiceLessonProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Start voice session
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/voice/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          profileId,
          topic: topic || 'general conversation'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      return response.json();
    },
    onSuccess: (data: { sessionId: string; initialPrompt: string }) => {
      setSessionId(data.sessionId);
      setConversationHistory([{
        role: 'assistant',
        content: data.initialPrompt,
        timestamp: new Date()
      }]);
      
      // Speak initial prompt
      speakText(data.initialPrompt);
      
      toast({
        title: 'Voice lesson started!',
        description: 'Start speaking when ready'
      });
    },
    onError: () => {
      toast({
        title: 'Failed to start session',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  // Process voice input
  const processVoiceMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', sessionId!);
      formData.append('profileId', profileId);

      const response = await fetch('/api/voice/interact', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to process voice input');
      }

      return response.json();
    },
    onSuccess: (data: VoiceResponse) => {
      // Add user's transcribed message
      setConversationHistory(prev => [...prev, {
        role: 'user',
        content: data.transcript,
        timestamp: new Date()
      }]);

      // Add AI response
      setConversationHistory(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        feedback: data.feedback
      }]);

      // Speak AI response
      speakText(data.response);

      // Show corrections if any
      if (data.corrections && data.corrections.length > 0) {
        toast({
          title: 'Pronunciation feedback',
          description: data.corrections[0].explanation
        });
      }

      setRecordingState('idle');
    },
    onError: () => {
      toast({
        title: 'Processing failed',
        description: 'Please try again',
        variant: 'destructive'
      });
      setRecordingState('idle');
    }
  });

  // End voice session
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/voice/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          profileId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      return response.json();
    },
    onSuccess: (data: { xpAwarded: number }) => {
      toast({
        title: 'Session completed!',
        description: `You earned ${data.xpAwarded} XP`
      });
      onComplete?.(data.xpAwarded);
      setSessionId(null);
      setConversationHistory([]);
    },
    onError: () => {
      toast({
        title: 'Failed to end session',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  // Initialize media recorder
  useEffect(() => {
    const initializeRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        setAudioStream(stream);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          title: 'Microphone access required',
          description: 'Please allow microphone access for voice lessons',
          variant: 'destructive'
        });
      }
    };

    initializeRecorder();

    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const startRecording = () => {
    if (!audioStream) {
      toast({
        title: 'Microphone not ready',
        description: 'Please allow microphone access',
        variant: 'destructive'
      });
      return;
    }

    const recorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    const audioChunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      setRecordingState('processing');
      processVoiceMutation.mutate(audioBlob);
    };

    setMediaRecorder(recorder);
    recorder.start();
    setRecordingState('recording');
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Voice Conversation Lesson
          </CardTitle>
          <CardDescription>
            Practice speaking with your AI language teacher
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sessionId ? (
            <Button
              className="w-full"
              onClick={() => startSessionMutation.mutate()}
              disabled={startSessionMutation.isPending}
            >
              {startSessionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Start Voice Lesson
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                {recordingState === 'idle' ? (
                  <Button
                    className="flex-1"
                    onClick={startRecording}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Hold to Speak
                  </Button>
                ) : recordingState === 'recording' ? (
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={stopRecording}
                  >
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Recording
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    disabled
                  >
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => endSessionMutation.mutate()}
                  disabled={endSessionMutation.isPending || recordingState !== 'idle'}
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              </div>

              {recordingState === 'processing' && (
                <div className="space-y-2">
                  <Progress value={50} className="w-full" />
                  <p className="text-sm text-center text-muted-foreground">
                    Transcribing and analyzing your speech...
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {conversationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              {conversationHistory.length} messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96" ref={scrollRef}>
              <div className="space-y-4">
                {conversationHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={message.role === 'user' ? 'secondary' : 'default'}>
                          {message.role === 'user' ? 'You' : 'AI Teacher'}
                        </Badge>
                        {message.role === 'assistant' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakText(message.content)}
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{message.content}</p>
                      {message.feedback && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs opacity-75">
                            💡 {message.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {sessionId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Click the microphone button and speak clearly
              </p>
              <p className="text-xs text-muted-foreground">
                The AI will respond with feedback and continue the conversation
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
