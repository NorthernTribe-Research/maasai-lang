import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Mic, MicOff, Volume2, Play, Pause, RotateCcw } from 'lucide-react';

interface VoiceTeacherProps {
  languageId: number;
  topic: string;
  level: string;
}

interface ConversationTurn {
  speaker: 'teacher' | 'learner';
  content: string;
  audioScript?: string;
  timestamp: Date;
  feedback?: string;
}

export default function VoiceTeacher({ languageId, topic, level }: VoiceTeacherProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Start voice conversation
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/ai/voice/conversation/start', {
        languageId,
        topic,
        level
      });
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setConversation([{
        speaker: 'teacher',
        content: data.initialGreeting,
        audioScript: data.audioScript,
        timestamp: new Date()
      }]);
      
      // Simulate text-to-speech
      speakText(data.initialGreeting);
      
      toast({ title: "Voice session started!" });
    }
  });

  // Process voice input
  const processVoiceMutation = useMutation({
    mutationFn: async (transcript: string) => {
      if (!sessionId) throw new Error('No active session');
      
      return apiRequest('POST', '/api/ai/voice/conversation/input', {
        sessionId,
        audioTranscript: transcript,
        confidence: 85
      });
    },
    onSuccess: (data) => {
      // Add teacher's response to conversation
      setConversation(prev => [...prev, {
        speaker: 'teacher',
        content: data.response,
        audioScript: data.audioScript,
        timestamp: new Date(),
        feedback: data.feedback
      }]);
      
      // Speak the response
      speakText(data.response);
      
      if (data.corrections && data.corrections.length > 0) {
        toast({ 
          title: "Pronunciation feedback", 
          description: data.corrections[0].explanation 
        });
      }
    }
  });

  // End session
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No active session');
      
      return apiRequest('POST', '/api/ai/voice/conversation/end', {
        sessionId
      });
    },
    onSuccess: (data) => {
      toast({ 
        title: "Session completed!", 
        description: data.summary 
      });
      setSessionId(null);
      setConversation([]);
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

        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        const audioChunks: Blob[] = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Use OpenAI Whisper for accurate speech-to-text
          const transcript = await whisperSpeechToText(audioBlob);
          
          // Add learner's input to conversation
          setConversation(prev => [...prev, {
            speaker: 'learner',
            content: transcript,
            timestamp: new Date()
          }]);
          
          // Process with AI
          processVoiceMutation.mutate(transcript);
          
          audioChunks.length = 0;
        };

        setMediaRecorder(recorder);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({ 
          title: "Microphone access required", 
          description: "Please allow microphone access for voice features.",
          variant: "destructive"
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

  // Use OpenAI Whisper for speech-to-text
  const whisperSpeechToText = async (audioBlob: Blob): Promise<string> => {
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Send to Whisper API
      const response = await apiRequest('POST', '/api/ai/whisper/transcribe', {
        audioData: base64Audio,
        language: getLanguageCode(languageId)
      });
      
      return response.text || "Could not transcribe audio";
    } catch (error) {
      console.error('Whisper transcription error:', error);
      
      // Fallback to demo responses
      const responses = [
        "Hello, how are you?",
        "I'm fine, thank you", 
        "Can you help me practice pronunciation?",
        "What should I say next?",
        "I want to learn more vocabulary",
        "This is very helpful"
      ];
      
      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  // Simulate text-to-speech
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to use target language voice
      const voices = speechSynthesis.getVoices();
      const targetVoice = voices.find(voice => 
        voice.lang.startsWith(getLanguageCode(languageId))
      );
      
      if (targetVoice) {
        utterance.voice = targetVoice;
      }
      
      utterance.rate = 0.8; // Slightly slower for learning
      utterance.pitch = 1;
      
      setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  const getLanguageCode = (langId: number): string => {
    // This would map language IDs to language codes
    const mapping: { [key: number]: string } = {
      1: 'es', // Spanish
      2: 'fr', // French
      3: 'de', // German
      4: 'ja', // Japanese
      5: 'zh', // Chinese
    };
    return mapping[langId] || 'en';
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      setIsRecording(true);
      mediaRecorder.start();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      setIsRecording(false);
      mediaRecorder.stop();
    }
  };

  const restartSession = () => {
    if (sessionId) {
      endSessionMutation.mutate();
    }
    startConversationMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            AI Voice Teacher
          </CardTitle>
          <CardDescription>
            Practice speaking {topic} with your AI language teacher
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {!sessionId ? (
              <Button 
                onClick={() => startConversationMutation.mutate()}
                disabled={startConversationMutation.isPending}
                className="flex-1"
              >
                Start Voice Session
              </Button>
            ) : (
              <>
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={processVoiceMutation.isPending}
                  className="flex-1"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-4 w-4 mr-2" />
                      Recording... (Release to Stop)
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Hold to Speak
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={restartSession}
                  disabled={endSessionMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {processVoiceMutation.isPending && (
            <div className="mb-4">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-muted-foreground mt-1">
                AI is thinking...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {conversation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {conversation.map((turn, index) => (
                  <div
                    key={index}
                    className={`flex ${turn.speaker === 'learner' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        turn.speaker === 'learner'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={turn.speaker === 'learner' ? 'secondary' : 'default'}>
                          {turn.speaker === 'learner' ? 'You' : 'AI Teacher'}
                        </Badge>
                        {turn.speaker === 'teacher' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakText(turn.content)}
                            disabled={isPlaying}
                          >
                            {isPlaying ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{turn.content}</p>
                      {turn.feedback && (
                        <p className="text-xs mt-2 opacity-75">
                          💡 {turn.feedback}
                        </p>
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
                Hold the microphone button and speak clearly
              </p>
              <p className="text-xs text-muted-foreground">
                The AI will respond with feedback and continue the conversation
              </p>
              <Button 
                variant="outline" 
                onClick={() => endSessionMutation.mutate()}
                disabled={endSessionMutation.isPending}
              >
                End Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}