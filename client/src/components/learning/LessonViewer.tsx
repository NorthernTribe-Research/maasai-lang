import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LoadingState } from '@/components/ui/loading-state';
import { BookOpen, Volume2, Globe, CheckCircle, Loader2 } from 'lucide-react';
import {
  flushQueuedLessonCompletions,
  getOfflineAiLessonPackage,
  isLikelyNetworkError,
  queueAiLessonCompletion,
  saveOfflineAiLessonPackage,
} from '@/lib/offline-lessons';

interface LessonViewerProps {
  lessonId: string;
  profileId: string;
  onComplete?: (xpAwarded: number) => void;
}

interface VocabularyItem {
  word: string;
  translation: string;
  pronunciation: string;
  partOfSpeech: string;
  exampleSentences: string[];
  culturalNote?: string;
  audioUrl?: string;
}

interface GrammarSection {
  topic: string;
  explanation: string;
  examples: string[];
  rules: string[];
  culturalUsage?: string;
}

interface CulturalSection {
  topic: string;
  content: string;
  customs?: string[];
  traditions?: string[];
  etiquette?: string[];
  practicalTips?: string[];
  commonMistakes?: string[];
  regionalVariations?: string;
  imageUrls?: string[];
  relevance: string;
}

interface Lesson {
  id: string;
  title: string;
  proficiencyLevel: string;
  vocabulary: VocabularyItem[];
  grammar: GrammarSection[];
  culturalContent: CulturalSection[];
  estimatedDuration: number;
}

interface LessonLoadResult {
  lesson: Lesson;
  source: 'online' | 'offline';
}

interface CompletionMetrics {
  accuracy: number;
  completionTime: number;
  errorsCount: number;
  errorPatterns: string[];
}

export default function LessonViewer({ lessonId, profileId, onComplete }: LessonViewerProps) {
  const [currentSection, setCurrentSection] = useState<'vocabulary' | 'grammar' | 'culture'>('vocabulary');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [startTime] = useState(Date.now());
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.navigator.onLine;
  });
  const [offlineSavedAt, setOfflineSavedAt] = useState<string | null>(() => {
    return getOfflineAiLessonPackage<Lesson>(lessonId, profileId)?.downloadedAt ?? null;
  });
  const { toast } = useToast();

  useEffect(() => {
    setOfflineSavedAt(getOfflineAiLessonPackage<Lesson>(lessonId, profileId)?.downloadedAt ?? null);
  }, [lessonId, profileId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshOfflineSavedAt = () => {
    setOfflineSavedAt(getOfflineAiLessonPackage<Lesson>(lessonId, profileId)?.downloadedAt ?? null);
  };

  // Fetch lesson data
  const { data: lessonPayload, isLoading, error } = useQuery<LessonLoadResult>({
    queryKey: ['lesson', lessonId, profileId, isOnline],
    queryFn: async () => {
      const cachedPackage = getOfflineAiLessonPackage<Lesson>(lessonId, profileId);

      if (!isOnline) {
        if (cachedPackage) {
          return { lesson: cachedPackage.lesson, source: 'offline' };
        }
        throw new Error("You're offline. Download this lesson first to study without internet.");
      }

      try {
        const response = await fetch(`/api/lessons/${lessonId}?profileId=${encodeURIComponent(profileId)}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Failed to fetch lesson');
        }

        const lessonData = await response.json() as Lesson;
        saveOfflineAiLessonPackage<Lesson>({
          lessonId,
          profileId,
          downloadedAt: new Date().toISOString(),
          lesson: lessonData,
        });
        return { lesson: lessonData, source: 'online' };
      } catch (fetchError) {
        if (cachedPackage && isLikelyNetworkError(fetchError)) {
          return { lesson: cachedPackage.lesson, source: 'offline' };
        }
        throw fetchError;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const lesson = lessonPayload?.lesson;
  const lessonSource = lessonPayload?.source;

  useEffect(() => {
    if (lessonSource === 'online') {
      setOfflineSavedAt(getOfflineAiLessonPackage<Lesson>(lessonId, profileId)?.downloadedAt ?? null);
    }
  }, [lessonSource, lessonId, profileId]);

  const downloadLessonMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!isOnline) {
        throw new Error('Connect to the internet to download this lesson.');
      }

      const response = await fetch(`/api/lessons/${lessonId}?profileId=${encodeURIComponent(profileId)}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to download lesson');
      }

      const lessonData = await response.json() as Lesson;
      saveOfflineAiLessonPackage<Lesson>({
        lessonId,
        profileId,
        downloadedAt: new Date().toISOString(),
        lesson: lessonData,
      });
    },
    onSuccess: () => {
      refreshOfflineSavedAt();
      toast({
        title: 'Lesson downloaded',
        description: 'This AI lesson is now available offline.',
      });
    },
    onError: (downloadError: Error) => {
      toast({
        title: 'Download failed',
        description: downloadError.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  // Complete lesson mutation
  const completeLessonMutation = useMutation<{ xpAwarded: number }, Error, CompletionMetrics>({
    mutationFn: async (metrics: CompletionMetrics) => {
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          profileId,
          accuracy: metrics.accuracy,
          completionTime: metrics.completionTime,
          errorsCount: metrics.errorsCount,
          errorPatterns: metrics.errorPatterns
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to complete lesson');
      }

      return response.json() as Promise<{ xpAwarded: number }>;
    }
  });

  const markSectionComplete = (section: string) => {
    setCompletedSections(prev => new Set(prev).add(section));
  };

  const buildCompletionMetrics = (): CompletionMetrics => {
    return {
      completionTime: Math.floor((Date.now() - startTime) / 1000),
      accuracy: (completedSections.size / 3) * 100,
      errorsCount: 0,
      errorPatterns: [],
    };
  };

  const handleCompleteLesson = async () => {
    if (completedSections.size < 3) {
      toast({
        title: 'Complete all sections',
        description: 'Please review all sections before completing the lesson',
        variant: 'destructive'
      });
      return;
    }

    const metrics = buildCompletionMetrics();

    const queueCompletionAndFinish = () => {
      queueAiLessonCompletion({
        lessonId,
        profileId,
        accuracy: metrics.accuracy,
        completionTime: metrics.completionTime,
        errorsCount: metrics.errorsCount,
        errorPatterns: metrics.errorPatterns,
      });
      toast({
        title: 'Lesson saved offline',
        description: "Completion queued. We'll sync it when you're online.",
      });
      onComplete?.(0);
    };

    if (!isOnline) {
      queueCompletionAndFinish();
      return;
    }

    try {
      const data = await completeLessonMutation.mutateAsync(metrics);
      const syncResult = await flushQueuedLessonCompletions();

      toast({
        title: 'Lesson completed!',
        description: `You earned ${data.xpAwarded} XP`
      });

      if (syncResult.synced > 0) {
        toast({
          title: 'Offline progress synced',
          description: `Synced ${syncResult.synced} queued completion${syncResult.synced === 1 ? '' : 's'}.`,
        });
      }

      onComplete?.(data.xpAwarded);
    } catch (completionError) {
      if (isLikelyNetworkError(completionError)) {
        queueCompletionAndFinish();
        return;
      }

      toast({
        title: 'Failed to complete lesson',
        description: completionError instanceof Error ? completionError.message : 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <LoadingState
            compact
            title={isOnline ? "Loading lesson..." : "Opening downloaded lesson..."}
            description={
              isOnline
                ? "Preparing vocabulary, grammar, and culture sections."
                : "Using your saved AI lesson content for offline study."
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load lesson"
        message={(error as Error).message || "We couldn't load this lesson. Please try again."}
        error={error as Error}
        onRetry={() => window.location.reload()}
        variant="card"
      />
    );
  }

  if (!lesson) {
    return (
      <ErrorDisplay
        title="Lesson not found"
        message="The lesson you're looking for doesn't exist or has been removed."
        variant="card"
      />
    );
  }

  const progress = (completedSections.size / 3) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {lesson.title}
              </CardTitle>
              <CardDescription>
                {lesson.proficiencyLevel} • {lesson.estimatedDuration} minutes
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lessonSource === 'offline' && <Badge variant="outline">Offline copy</Badge>}
              <Badge variant={completedSections.size === 3 ? 'default' : 'secondary'}>
                {completedSections.size}/3 sections
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadLessonMutation.mutate()}
                disabled={downloadLessonMutation.isPending || !isOnline}
              >
                {downloadLessonMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Downloading...
                  </>
                ) : offlineSavedAt ? (
                  'Refresh Offline'
                ) : (
                  'Download Offline'
                )}
              </Button>
            </div>
          </div>
          {offlineSavedAt && (
            <p className="text-xs text-muted-foreground">
              Offline copy saved {new Date(offlineSavedAt).toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <Tabs value={currentSection} onValueChange={(v) => setCurrentSection(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vocabulary" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Vocabulary
            {completedSections.has('vocabulary') && <CheckCircle className="h-3 w-3" />}
          </TabsTrigger>
          <TabsTrigger value="grammar" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Grammar
            {completedSections.has('grammar') && <CheckCircle className="h-3 w-3" />}
          </TabsTrigger>
          <TabsTrigger value="culture" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Culture
            {completedSections.has('culture') && <CheckCircle className="h-3 w-3" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vocabulary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vocabulary</CardTitle>
              <CardDescription>
                Learn {lesson.vocabulary.length} new words and phrases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {lesson.vocabulary.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-semibold">{item.word}</h4>
                              <p className="text-sm text-muted-foreground">
                                {item.pronunciation}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => speakText(item.word)}
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div>
                            <Badge variant="outline">{item.partOfSpeech}</Badge>
                            <p className="mt-2 text-sm">{item.translation}</p>
                          </div>
                          {item.exampleSentences.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Examples:</p>
                              <ul className="space-y-1">
                                {item.exampleSentences.map((sentence, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-primary">•</span>
                                    {sentence}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.culturalNote && (
                            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-start gap-2">
                                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    Cultural Context
                                  </p>
                                  <p className="text-xs text-blue-800 dark:text-blue-200">
                                    {item.culturalNote}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              {!completedSections.has('vocabulary') && (
                <Button
                  className="w-full mt-4"
                  onClick={() => markSectionComplete('vocabulary')}
                >
                  Mark Vocabulary as Complete
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grammar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grammar</CardTitle>
              <CardDescription>
                Master {lesson.grammar.length} grammar concepts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {lesson.grammar.map((section, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <h4 className="text-lg font-semibold">{section.topic}</h4>
                          <p className="text-sm">{section.explanation}</p>
                          
                          {section.rules.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Rules:</p>
                              <ul className="space-y-1">
                                {section.rules.map((rule, i) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-primary font-bold">{i + 1}.</span>
                                    {rule}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {section.examples.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Examples:</p>
                              <ul className="space-y-1">
                                {section.examples.map((example, i) => (
                                  <li key={i} className="text-sm bg-muted p-2 rounded">
                                    {example}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {section.culturalUsage && (
                            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-start gap-2">
                                <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    Cultural Usage
                                  </p>
                                  <p className="text-xs text-blue-800 dark:text-blue-200">
                                    {section.culturalUsage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              {!completedSections.has('grammar') && (
                <Button
                  className="w-full mt-4"
                  onClick={() => markSectionComplete('grammar')}
                >
                  Mark Grammar as Complete
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="culture" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cultural Content</CardTitle>
              <CardDescription>
                Explore {lesson.culturalContent.length} cultural insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {lesson.culturalContent.map((section, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-lg font-semibold mb-2">{section.topic}</h4>
                            <p className="text-sm">{section.content}</p>
                          </div>
                          
                          {section.customs && section.customs.length > 0 && (
                            <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                                <span className="text-lg">🎭</span>
                                Customs & Traditions
                              </p>
                              <ul className="space-y-2">
                                {section.customs.map((custom, i) => (
                                  <li key={i} className="text-xs text-purple-800 dark:text-purple-200 flex items-start gap-2">
                                    <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                                    {custom}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {section.traditions && section.traditions.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                                <span className="text-lg">🏛️</span>
                                Traditional Practices
                              </p>
                              <ul className="space-y-2">
                                {section.traditions.map((tradition, i) => (
                                  <li key={i} className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                                    {tradition}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {section.etiquette && section.etiquette.length > 0 && (
                            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                              <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                                <span className="text-lg">🤝</span>
                                Social Etiquette
                              </p>
                              <ul className="space-y-2">
                                {section.etiquette.map((rule, i) => (
                                  <li key={i} className="text-xs text-green-800 dark:text-green-200 flex items-start gap-2">
                                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                                    {rule}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {section.practicalTips && section.practicalTips.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                <span className="text-lg">💡</span>
                                Practical Tips
                              </p>
                              <ul className="space-y-2">
                                {section.practicalTips.map((tip, i) => (
                                  <li key={i} className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{i + 1}.</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {section.commonMistakes && section.commonMistakes.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                              <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                                <span className="text-lg">⚠️</span>
                                Common Mistakes to Avoid
                              </p>
                              <ul className="space-y-2">
                                {section.commonMistakes.map((mistake, i) => (
                                  <li key={i} className="text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                                    <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
                                    {mistake}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {section.regionalVariations && (
                            <div className="bg-indigo-50 dark:bg-indigo-950 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
                              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
                                <span className="text-lg">🗺️</span>
                                Regional Variations
                              </p>
                              <p className="text-xs text-indigo-800 dark:text-indigo-200">
                                {section.regionalVariations}
                              </p>
                            </div>
                          )}
                          
                          {section.imageUrls && section.imageUrls.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {section.imageUrls.map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt={`${section.topic} ${i + 1}`}
                                  className="rounded-lg w-full h-32 object-cover"
                                />
                              ))}
                            </div>
                          )}
                          
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-xs font-medium mb-1">Why this matters:</p>
                            <p className="text-xs text-muted-foreground">{section.relevance}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              {!completedSections.has('culture') && (
                <Button
                  className="w-full mt-4"
                  onClick={() => markSectionComplete('culture')}
                >
                  Mark Culture as Complete
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={handleCompleteLesson}
            disabled={completedSections.size < 3 || completeLessonMutation.isPending}
          >
            {completeLessonMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Lesson
              </>
            )}
          </Button>
          {completedSections.size < 3 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Complete all sections to finish the lesson
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
