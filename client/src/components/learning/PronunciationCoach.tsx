import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Volume2, Target, TrendingUp, Loader2, RotateCcw } from 'lucide-react';

interface PronunciationCoachProps {
  targetPhrase: string;
  targetLanguage: string;
  profileId: string;
  onComplete?: () => void;
}

interface PhonemeAnalysis {
  phoneme: string;
  accuracy: number;
  position: number;
  feedback: string;
}

interface PronunciationResult {
  score: number;
  feedback: string;
  problematicPhonemes: PhonemeAnalysis[];
  audioExamples?: string[];
}

interface Attempt {
  score: number;
  timestamp: Date;
}

export default function PronunciationCoach({ 
  targetPhrase, 
  targetLanguage, 
  profileId,
  onComplete 
}: PronunciationCoachProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const { toast } = useToast();

  // Analyze pronunciation
  const analyzePronunciationMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'pronunciation.webm');
      formData.append('profileId', profileId);
      formData.append('targetText', targetPhrase);
      formData.append('language', targetLanguage);

      const response = await fetch('/api/speech/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to analyze pronunciation');
      }

      return response.json();
    },
    onSuccess: (data: PronunciationResult) => {
      setResult(data);
      setAttempts(prev => [...prev, {
        score: data.score,
        timestamp: new Date()
      }]);

      if (data.score >= 80) {
        toast({
          title: 'Excellent pronunciation!',
          description: `Score: ${data.score}/100`
        });
      } else if (data.score >= 60) {
        toast({
          title: 'Good effort!',
          description: 'Keep practicing to improve'
        });
      } else {
        toast({
          title: 'Keep practicing',
          description: 'Try speaking more slowly and clearly',
          variant: 'destructive'
        });
      }
    },
    onError: () => {
      toast({
        title: 'Analysis failed',
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
            autoGainControl: true,
            sampleRate: 16000
          }
        });
        setAudioStream(stream);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          title: 'Microphone access required',
          description: 'Please allow microphone access for pronunciation practice',
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
      analyzePronunciationMutation.mutate(audioBlob);
    };

    setMediaRecorder(recorder);
    recorder.start();
    setIsRecording(true);
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

  const speakExample = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(targetPhrase);
      utterance.rate = 0.7;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
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
            Pronunciation Coach
          </CardTitle>
          <CardDescription>
            Practice pronunciation with AI-powered feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Practice this phrase:</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={speakExample}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-lg font-medium">{targetPhrase}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{targetLanguage}</Badge>
              {attempts.length > 0 && (
                <Badge variant="secondary">
                  {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {!isRecording ? (
              <Button
                className="flex-1"
                onClick={startRecording}
                disabled={analyzePronunciationMutation.isPending}
              >
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                className="flex-1"
                variant="destructive"
                onClick={stopRecording}
              >
                <MicOff className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}

            {result && (
              <Button
                variant="outline"
                onClick={resetPractice}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {analyzePronunciationMutation.isPending && (
            <div className="space-y-2">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Analyzing pronunciation with AI...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Pronunciation Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pronunciation Score</span>
                <Badge variant={getScoreBadgeVariant(result.score)} className="text-lg px-3 py-1">
                  {result.score}/100
                </Badge>
              </div>

              <Progress value={result.score} className="w-full h-3" />

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Overall Feedback</h4>
                <p className="text-sm">{result.feedback}</p>
              </div>

              {result.problematicPhonemes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Areas for Improvement</h4>
                  <div className="space-y-2">
                    {result.problematicPhonemes.map((phoneme, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono">
                                  {phoneme.phoneme}
                                </Badge>
                                <span className={`text-sm font-medium ${getScoreColor(phoneme.accuracy)}`}>
                                  {phoneme.accuracy}%
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {phoneme.feedback}
                              </p>
                            </div>
                            <Progress 
                              value={phoneme.accuracy} 
                              className="w-16 h-2 mt-1"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {result.audioExamples && result.audioExamples.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Audio Examples</h4>
                  <div className="space-y-2">
                    {result.audioExamples.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => speakExample()}
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        Listen to correct pronunciation
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {result.score >= 80 && onComplete && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  className="w-full"
                  onClick={onComplete}
                >
                  Complete Practice
                </Button>
              </CardContent>
            </Card>
          )}
        </>
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
                      {attempt.score}/100
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {attempts.length >= 2 && (
              <div className="mt-3 text-sm text-center">
                <span className="text-muted-foreground">Improvement: </span>
                <span className={attempts[attempts.length - 1].score - attempts[0].score >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {attempts[attempts.length - 1].score - attempts[0].score > 0 ? '+' : ''}
                  {attempts[attempts.length - 1].score - attempts[0].score} points
                </span>
                <span className="text-muted-foreground"> from first attempt</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
