import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Book, BookOpen, Clock, MessageSquare, Lightbulb, RefreshCw, BookMarked } from "lucide-react";
import { apiRequestJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface AILanguageTeacherProps {
  language: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
  lessonId?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TeacherPersona {
  name: string;
  personality: string;
  level: number;
}

export default function AILanguageTeacher({ language, lessonId }: AILanguageTeacherProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<TeacherPersona | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch available teacher personas
  const { data: teacherPersonas = [] } = useQuery<TeacherPersona[]>({ 
    queryKey: ['/api/ai/language-teacher/personas', language.id],
    queryFn: async () => {
      return apiRequestJson<TeacherPersona[]>('GET', `/api/ai/language-teacher/personas/${language.id}`);
    },
    enabled: !!language.id
  });

  // Set default teacher based on lesson level or first available
  useEffect(() => {
    if (teacherPersonas.length > 0) {
      let defaultTeacher: TeacherPersona;
      
      if (lessonId) {
        // Try to find a teacher that matches the lesson level (simplified example)
        const lessonLevel = 1; // In a real app, this would come from the lesson data
        defaultTeacher = teacherPersonas.find(t => t.level === lessonLevel) || teacherPersonas[0];
      } else {
        defaultTeacher = teacherPersonas[0];
      }
      
      setCurrentTeacher(defaultTeacher);
      
      // Initialize chat with a welcome message from this teacher
      setChatHistory([{
        role: 'assistant',
        content: `Hello! I'm ${defaultTeacher.name}, your ${language.name} language teacher. I am ${defaultTeacher.personality}. How can I help you today?`,
        timestamp: new Date()
      }]);
    }
  }, [teacherPersonas, language.name, lessonId]);

  // Common language learning topics
  const topics = [
    { icon: <Book className="h-4 w-4 mr-2" />, label: "Grammar", prompt: `Explain a basic grammar rule in ${language.name}` },
    { icon: <BookOpen className="h-4 w-4 mr-2" />, label: "Vocabulary", prompt: `Teach me 5 useful everyday words in ${language.name}` },
    { icon: <MessageSquare className="h-4 w-4 mr-2" />, label: "Conversation", prompt: `Give me a simple conversation example in ${language.name}` },
    { icon: <Clock className="h-4 w-4 mr-2" />, label: "Practice", prompt: `Give me a quick exercise to practice ${language.name}` },
    { icon: <Lightbulb className="h-4 w-4 mr-2" />, label: "Culture", prompt: `Tell me an interesting cultural fact about ${language.name} speaking regions` }
  ];

  if (lessonId) {
    topics.push({ 
      icon: <BookMarked className="h-4 w-4 mr-2" />, 
      label: "Lesson Help", 
      prompt: `I need help with this lesson, can you explain it again?` 
    });
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !currentTeacher) return;
    
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    try {
      const response = await apiRequestJson<{ reply: string }>('POST', '/api/ai/language-teacher', {
        languageId: language.id,
        lessonId: lessonId || null,
        message: userMessage.content,
        history: chatHistory.map(msg => ({ role: msg.role, content: msg.content }))
      });
      
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error getting AI teacher response:', error);
      toast({
        title: "Communication Error",
        description: "Could not connect to your language teacher. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectTopic = (prompt: string) => {
    setMessage(prompt);
    setSelectedTopic(prompt);
  };

  const changeTeacher = (teacherName: string) => {
    const newTeacher = teacherPersonas.find(t => t.name === teacherName);
    if (newTeacher && newTeacher.name !== currentTeacher?.name) {
      setCurrentTeacher(newTeacher);
      
      // Add a transition message from the new teacher
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `Hello! I'm ${newTeacher.name}, your new ${language.name} teacher. I am ${newTeacher.personality}. How can I help you today?`,
        timestamp: new Date()
      }]);
    }
  };

  const resetChat = () => {
    if (!currentTeacher) return;
    
    setChatHistory([{
      role: 'assistant',
      content: `Hello! I'm ${currentTeacher.name}, your ${language.name} language teacher. I am ${currentTeacher.personality}. How can I help you today?`,
      timestamp: new Date()
    }]);
    setSelectedTopic(null);
  };

  if (!currentTeacher) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-md p-8 text-center">
        <p>Loading your language teacher...</p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-md">
      <CardHeader className="bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-12 w-12 mr-4">
              <AvatarImage src={`https://flagcdn.com/${language.code.toLowerCase()}.svg`} alt={language.name} />
              <AvatarFallback>{language.code.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{currentTeacher.name} - {language.name} Teacher</CardTitle>
              <CardDescription>
                {currentTeacher.personality} • Level {currentTeacher.level}
              </CardDescription>
            </div>
          </div>
          
          {teacherPersonas.length > 1 && (
            <Select value={currentTeacher.name} onValueChange={changeTeacher}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teacherPersonas.map((teacher) => (
                  <SelectItem key={teacher.name} value={teacher.name}>
                    {teacher.name} (Level {teacher.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4 max-h-96 overflow-y-auto">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent">
          {topics.map((topic, i) => (
            <Button 
              key={i} 
              variant={selectedTopic === topic.prompt ? "default" : "outline"}
              size="sm"
              onClick={() => selectTopic(topic.prompt)}
              className="flex items-center whitespace-nowrap"
            >
              {topic.icon} {topic.label}
            </Button>
          ))}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={resetChat} 
            className="flex items-center ml-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>

        <div className="space-y-4">
          {chatHistory.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-2 rounded-lg bg-muted">
                <p>{currentTeacher.name} is thinking...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <div className="flex w-full space-x-2">
          <Textarea
            placeholder={`Ask ${currentTeacher.name} a question...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 min-h-[60px] max-h-[120px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !message.trim()} 
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
