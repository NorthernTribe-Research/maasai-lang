import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequestJson } from '@/lib/queryClient';
import { Mic, MicOff, Volume2, RotateCcw, Target, TrendingUp } from 'lucide-react';

interface WhisperPronunciationProps {
  targetPhrase: string;
  targetLanguage: string;
  userLevel: string;
}

interface PronunciationResult {
  transcription: string;
  feedback: string;
  score: number;
  improvements: string[];
  nextSteps: string[];
}

export default function WhisperPronunciation({ 
  targetPhrase, 
  targetLanguage, 
  userLevel 
}: WhisperPronunciationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [attempts, setAttempts] = useState<PronunciationResult[]>([]);
  const { toast } = useToast();

  // Pronunciation analysis mutation
  const analyzePronunciationMutation = useMutation({
    mutationFn: async (audioData: string) => {
      return apiRequestJson<PronunciationResult>('POST', '/api/ai/whisper/coaching', {
        audioData,
        targetPhrase,
        targetLanguage,
        userLevel
      });
    },
    onSuccess: (data: PronunciationResult) => {
      setResult(data);
      setAttempts(prev => [...prev, data]);
      
      if (data.score >= 80) {
        toast({ 
          title: "Excellent pronunciation!", 
          description: `Score: ${data.score}%` 
        });
      } else if (data.score >= 60) {
        toast({ 
          title: "Good effort!", 
          description: data.improvements[0] || "Keep practicing" 
        });
      } else {
        toast({ 
          title: "Keep practicing", 
          description: "Try speaking more slowly and clearly",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({ 
        title: "Analysis failed", 
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  // Initialize recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

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
        
        // Convert to base64
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        let binary = "";
        uint8.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        const base64Audio = btoa(binary);
        
        // Analyze with Whisper
        analyzePronunciationMutation.mutate(base64Audio);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioChunks.length = 0;
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({ 
        title: "Microphone access required", 
        description: "Please allow microphone access for pronunciation practice.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const resetPractice = () => {
    setResult(null);
    setAttempts([]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Whisper Pronunciation Practice
          </CardTitle>
          <CardDescription>
            Practice pronunciation with OpenAI Whisper analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Practice this phrase:</h4>
              <p className="text-lg">{targetPhrase}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{targetLanguage}</Badge>
                <Badge variant="outline">{userLevel}</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={analyzePronunciationMutation.isPending}
                  className="flex-1"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1"
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              )}
              
              {result && (
                <Button
                  onClick={resetPractice}
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>

            {analyzePronunciationMutation.isPending && (
              <div className="space-y-2">
                <Progress value={50} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  Analyzing pronunciation with Whisper AI...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pronunciation Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pronunciation Score</span>
                <Badge variant={getScoreBadgeVariant(result.score)}>
                  {result.score}%
                </Badge>
              </div>
              
              <Progress value={result.score} className="w-full" />

              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-1">What you said:</h4>
                  <p className="text-sm bg-muted p-2 rounded">{result.transcription}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-1">Feedback:</h4>
                  <p className="text-sm">{result.feedback}</p>
                </div>

                {result.improvements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Areas for improvement:</h4>
                    <ul className="space-y-1">
                      {result.improvements.map((improvement, index) => (
                        <li key={index} className="text-sm flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-orange-500 rounded-full" />
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.nextSteps.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Next steps:</h4>
                    <ul className="space-y-1">
                      {result.nextSteps.map((step, index) => (
                        <li key={index} className="text-sm flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {attempts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Practice History</CardTitle>
            <CardDescription>
              Your pronunciation progress over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {attempts.map((attempt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <span className="text-sm">Attempt {index + 1}</span>
                    <Badge variant={getScoreBadgeVariant(attempt.score)}>
                      {attempt.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {attempts.length >= 2 && (
              <div className="mt-3 text-sm text-muted-foreground">
                Improvement: {attempts[attempts.length - 1].score - attempts[0].score > 0 ? '+' : ''}
                {attempts[attempts.length - 1].score - attempts[0].score}% from first attempt
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
