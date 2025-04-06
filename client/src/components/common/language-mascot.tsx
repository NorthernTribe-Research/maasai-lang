import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Info, MessageCircle, Volume2 } from 'lucide-react';

interface LanguageMascotProps {
  language: string;
  context?: string;
  level?: string;
  streakDays?: number;
  recentTopics?: string[];
}

const LanguageMascot = ({
  language,
  context = 'general learning',
  level = 'beginner',
  streakDays = 0,
  recentTopics = []
}: LanguageMascotProps) => {
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mascotData, setMascotData] = useState<{
    dialogue: string;
    culturalTip: string;
    encouragement: string;
  } | null>(null);
  const [showTip, setShowTip] = useState(false);
  const { toast } = useToast();

  // Get mascot emoji based on language
  const getMascotEmoji = () => {
    switch (language.toLowerCase()) {
      case 'spanish':
        return '🦊'; // Fox for Spanish
      case 'french':
        return '🐸'; // Frog for French
      case 'japanese':
        return '🐱'; // Cat for Japanese
      case 'german':
        return '🦅'; // Eagle for German
      case 'italian':
        return '🦁'; // Lion for Italian
      case 'chinese':
        return '🐼'; // Panda for Chinese
      default:
        return '🦉'; // Owl for any other language
    }
  };

  const getMascotName = () => {
    switch (language.toLowerCase()) {
      case 'spanish':
        return 'Lingo'; 
      case 'french':
        return 'Pierre';
      case 'japanese':
        return 'Neko';
      case 'german':
        return 'Adler';
      case 'italian':
        return 'Leo';
      case 'chinese':
        return 'Bamboo';
      default:
        return 'Lingo';
    }
  };

  useEffect(() => {
    const fetchMascotDialogue = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('POST', '/api/gemini/mascot', {
          language,
          context,
          userProgress: {
            level,
            recentTopics: recentTopics.length > 0 ? recentTopics : ['greetings', 'basic phrases', 'numbers'],
            streakDays
          }
        });
        
        const data = await response.json();
        setMascotData(data);
      } catch (error) {
        console.error('Failed to fetch mascot dialogue:', error);
        toast({
          title: 'Error',
          description: 'Failed to load mascot dialogue. Please try again later.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMascotDialogue();
  }, [language, context, level, streakDays, recentTopics, toast]);

  const speakText = (text: string) => {
    if (speaking) return;
    
    setSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language code
    utterance.lang = language === 'Spanish' ? 'es-ES' : 
                    language === 'French' ? 'fr-FR' : 
                    language === 'German' ? 'de-DE' : 'en-US';
    
    utterance.onend = () => {
      setSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">{getMascotEmoji()}</div>
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!mascotData) return null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <div className="text-4xl self-center">{getMascotEmoji()}</div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-lg">{getMascotName()}</h3>
              
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => setShowTip(!showTip)}
                >
                  <Info className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => speakText(mascotData.dialogue)}
                  disabled={speaking}
                >
                  <Volume2 className={`h-4 w-4 ${speaking ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
            </div>
            
            <div className="bg-primary/10 p-3 rounded-lg rounded-tl-none">
              <p className="text-sm">{mascotData.dialogue}</p>
            </div>
            
            {showTip && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium">Cultural Tip</h4>
                </div>
                <p className="text-sm">{mascotData.culturalTip}</p>
                
                <div className="border-t border-border pt-2 mt-2">
                  <p className="text-sm italic">{mascotData.encouragement}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LanguageMascot;