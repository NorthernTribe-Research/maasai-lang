import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Mic, Play, Volume2 } from 'lucide-react';

interface PronunciationChallengeProps {
  language: string;
  text: string;
  onComplete: (accuracy: number) => void;
}

const PronunciationChallenge = ({ language, text, onComplete }: PronunciationChallengeProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<{
    accuracy: number;
    feedback: string;
    improvementTips: string[];
  } | null>(null);
  const { toast } = useToast();

  // This would be a real implementation with the Web Speech API
  const startRecording = () => {
    setIsRecording(true);
    setTranscript('');
    setFeedback(null);
    
    // Simulate speech recognition with a timeout
    setTimeout(() => {
      setIsRecording(false);
      // This is a simulated transcript - in real implementation, this would be the actual transcript
      const simulatedTranscript = text.split(' ').map(word => {
        // 80% chance the word is correct
        return Math.random() > 0.2 ? word : word.replace(/[aeiou]/i, 'a');
      }).join(' ');
      
      setTranscript(simulatedTranscript);
      processPronunciation(simulatedTranscript);
    }, 3000);
  };

  const processPronunciation = async (audioTranscription: string) => {
    try {
      setIsProcessing(true);
      
      const response = await apiRequest('POST', '/api/gemini/pronunciation', {
        language,
        originalText: text,
        audioTranscription
      });
      
      const result = await response.json();
      setFeedback(result);
      onComplete(result.accuracy);
    } catch (error) {
      console.error('Failed to process pronunciation:', error);
      toast({
        title: 'Error processing pronunciation',
        description: 'There was an error processing your pronunciation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = () => {
    // Text-to-speech functionality
    const utterance = new SpeechSynthesisUtterance(text);
    // Set language code appropriately
    utterance.lang = language === 'Spanish' ? 'es-ES' : 
                     language === 'French' ? 'fr-FR' : 
                     language === 'German' ? 'de-DE' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Pronunciation Challenge</CardTitle>
        <CardDescription>
          Listen to the correct pronunciation and repeat the text below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-primary/10 rounded-lg">
          <p className="text-lg font-medium text-center">{text}</p>
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={speakText}>
              <Volume2 className="h-4 w-4 mr-2" />
              Listen
            </Button>
          </div>
        </div>
        
        {transcript && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Your pronunciation:</p>
            <p className="text-md">{transcript}</p>
          </div>
        )}
        
        {feedback && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Accuracy</span>
                <span className="text-sm font-medium">{feedback.accuracy}%</span>
              </div>
              <Progress value={feedback.accuracy} className="h-2" />
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">{feedback.feedback}</p>
              <ul className="list-disc pl-5 space-y-1">
                {feedback.improvementTips.map((tip, i) => (
                  <li key={i} className="text-sm">{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={startRecording} 
          disabled={isRecording || isProcessing}
        >
          {isRecording ? (
            <>
              <Mic className="h-4 w-4 mr-2 animate-pulse" />
              Listening...
            </>
          ) : isProcessing ? (
            'Processing...'
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Start Speaking
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PronunciationChallenge;