import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, Clock, Award, CheckCircle } from 'lucide-react';

interface Milestone {
  title: string;
  description: string;
  estimatedTimeToComplete: string;
  skills: string[];
}

interface LearningPathData {
  overview: string;
  milestones: Milestone[];
}

interface LearningPathProps {
  language: string;
  currentLevel: string;
  userInterests?: string[];
}

const LearningPath = ({ language, currentLevel, userInterests = [] }: LearningPathProps) => {
  const [loading, setLoading] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null);
  const [currentMilestone, setCurrentMilestone] = useState(0);
  const { toast } = useToast();

  const learningGoals = [
    "Achieve conversational fluency",
    "Build comprehensive vocabulary",
    "Understand native speakers"
  ];

  useEffect(() => {
    const fetchLearningPath = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('POST', '/api/gemini/learning-path', {
          language,
          currentLevel,
          learningGoals,
          interests: userInterests.length > 0 ? userInterests : ['travel', 'culture', 'food', 'music']
        });
        
        const data = await response.json();
        setLearningPath(data);
      } catch (error) {
        console.error('Failed to fetch learning path:', error);
        toast({
          title: 'Error fetching learning path',
          description: 'There was an error generating your personalized learning path.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLearningPath();
  }, [language, currentLevel, toast, userInterests]);

  const advanceMilestone = () => {
    if (learningPath && currentMilestone < learningPath.milestones.length - 1) {
      setCurrentMilestone(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Generating your learning path...</CardTitle>
          <CardDescription>
            We're creating a personalized learning journey for your {language} adventure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!learningPath) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your {language} Learning Journey</CardTitle>
        <CardDescription>
          {learningPath.overview}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          {/* Timeline */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
          
          {/* Milestones */}
          <div className="space-y-8 relative">
            {learningPath.milestones.map((milestone, index) => {
              const isCompleted = index < currentMilestone;
              const isActive = index === currentMilestone;
              
              return (
                <div key={index} className="ml-9 relative">
                  {/* Milestone dot */}
                  <div 
                    className={`absolute -left-11 flex items-center justify-center w-7 h-7 rounded-full border-2 
                    ${isCompleted 
                      ? 'bg-primary border-primary' 
                      : isActive 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-background border-muted-foreground/20'}`}
                  >
                    {isCompleted && <CheckCircle className="h-4 w-4 text-primary-foreground" />}
                    {isActive && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  
                  {/* Milestone content */}
                  <Accordion type="single" collapsible defaultValue={isActive ? `milestone-${index}` : undefined}>
                    <AccordionItem value={`milestone-${index}`} className="border-0">
                      <AccordionTrigger 
                        className={`p-3 rounded-lg hover:bg-accent hover:no-underline
                        ${isActive ? 'bg-accent/50' : isCompleted ? 'text-muted-foreground' : ''}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{milestone.title}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={isCompleted ? "outline" : isActive ? "default" : "secondary"}>
                              <Clock className="h-3 w-3 mr-1" />
                              {milestone.estimatedTimeToComplete}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3">
                        <p className="mb-4 text-sm">{milestone.description}</p>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Skills you'll gain:</div>
                          <div className="flex flex-wrap gap-2">
                            {milestone.skills.map((skill, i) => (
                              <Badge key={i} variant="secondary">
                                <Award className="h-3 w-3 mr-1" />
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {isActive && (
                          <div className="mt-4">
                            <Button 
                              onClick={advanceMilestone} 
                              disabled={index >= learningPath.milestones.length - 1}
                              className="w-full"
                            >
                              Mark as Completed
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
                  <Separator className="my-2" />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningPath;