import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import LessonCard from "@/components/common/lesson-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Language, UserLanguage, Lesson, UserLesson } from "@shared/schema";

export default function Lessons() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [activeLanguageId, setActiveLanguageId] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<string>("all");
  
  // Parse language ID from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const languageId = params.get("languageId");
    if (languageId) {
      setActiveLanguageId(languageId);
    }
  }, [location]);
  
  // Fetch all available languages
  const { data: allLanguages, isLoading: isLoadingLanguages } = useQuery<Language[]>({
    queryKey: ["/api/languages"],
  });
  
  // Fetch user's languages
  const { data: userLanguages, refetch: refetchUserLanguages } = useQuery<Array<UserLanguage & { language: Language }>>({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });
  
  // Fetch user lessons for the active language
  const { data: userLessons, isLoading: isLoadingUserLessons } = useQuery<Array<UserLesson & { lesson: Lesson }>>({
    queryKey: ["/api/user/languages", parseInt(activeLanguageId || "0"), "lessons"],
    enabled: !!activeLanguageId && parseInt(activeLanguageId) > 0 && !!user,
  });
  
  // Mutation to enroll user in a language
  const enrollLanguageMutation = useMutation({
    mutationFn: async (languageId: number) => {
      const res = await apiRequest("POST", "/api/user/languages", { languageId });
      return res.json();
    },
    onSuccess: (data, languageId) => {
      toast({
        title: "Language enrolled!",
        description: "You can now start learning. Redirecting to lessons...",
      });
      
      // Refetch user languages and redirect
      queryClient.invalidateQueries({ queryKey: ["/api/user/languages"] });
      refetchUserLanguages();
      
      // Redirect to the language lessons page
      setTimeout(() => {
        setActiveLanguageId(languageId.toString());
        setLocation(`/lessons?languageId=${languageId}`);
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle Start Learning button click
  const handleStartLearning = (languageId: number) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to start learning",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }
    
    // Check if already enrolled
    const isEnrolled = userLanguages?.some((ul: UserLanguage & { language: Language }) => ul.languageId === languageId);
    
    if (isEnrolled) {
      // Already enrolled, just navigate to lessons
      setActiveLanguageId(languageId.toString());
      setLocation(`/lessons?languageId=${languageId}`);
    } else {
      // Enroll user in the language
      enrollLanguageMutation.mutate(languageId);
    }
  };
  
  // Handle language change
  const handleLanguageChange = (value: string) => {
    setActiveLanguageId(value);
    setLocation(`/lessons?languageId=${value}`);
  };
  
  // Filter lessons by level
  const filteredLessons = userLessons?.filter((lesson: UserLesson & { lesson: Lesson }) => {
    if (!lesson.lesson) return false;
    if (activeLevel === "all") return true;
    return lesson.lesson.level.toString() === activeLevel;
  });
  
  // Group lessons by level
  const getLevelGroups = () => {
    if (!userLessons) return [];
    
    const levels = Array.from(new Set(userLessons.filter(ul => ul.lesson).map((ul: UserLesson & { lesson: Lesson }) => ul.lesson.level))).sort();
    return levels;
  };
  
  // Find active language object
  const activeLanguage = allLanguages?.find((lang: Language) => lang.id.toString() === activeLanguageId);
  
  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4 animate-in fade-in slide-in-from-top duration-500">
        <div>
          <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {activeLanguage 
              ? `${activeLanguage.flag} ${activeLanguage.name} Lessons` 
              : "🌍 Choose a Language"}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">
            {activeLanguage 
              ? `Progress through your ${activeLanguage.name} learning path` 
              : "Select a language to start or continue your learning journey"}
          </p>
        </div>
        
        <div className="w-full md:w-72">
          <Select value={activeLanguageId || ""} onValueChange={handleLanguageChange}>
            <SelectTrigger className="h-12 text-base font-medium border-2 hover:border-primary transition-colors shadow-sm">
              <SelectValue placeholder="🌐 Select a language" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingLanguages ? (
                <SelectItem value="loading" disabled>Loading languages...</SelectItem>
              ) : allLanguages?.map((language: Language) => (
                <SelectItem key={language.id} value={language.id.toString()} className="text-base">
                  <span className="flex items-center gap-2">
                    <span>{language.flag}</span>
                    <span>{language.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {!activeLanguage && (
        <>
          {isLoadingLanguages ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-xl animate-pulse" />
              ))}
            </div>
          ) : allLanguages && allLanguages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allLanguages.map((language: Language, index: number) => {
                const userLanguage = userLanguages?.find((ul: UserLanguage & { language: Language }) => ul.languageId === language.id);
                
                // Enhanced gradient colors for each language
                const gradientMap: Record<string, string> = {
                  "es": "from-orange-500 via-red-500 to-yellow-500",
                  "zh": "from-red-600 via-red-500 to-orange-500",
                  "en": "from-blue-600 via-indigo-500 to-purple-500",
                  "hi": "from-orange-600 via-green-500 to-green-600",
                  "ar": "from-purple-600 via-fuchsia-500 to-pink-500",
                  "ja": "from-pink-600 via-rose-500 to-red-500",
                  "fr": "from-blue-500 via-blue-600 to-indigo-600",
                  "de": "from-gray-700 via-red-600 to-yellow-500",
                  "pt": "from-green-600 via-green-500 to-yellow-500",
                  "ru": "from-blue-700 via-white to-red-600",
                  "ko": "from-blue-600 via-red-500 to-blue-600",
                  "it": "from-green-600 via-white to-red-600",
                };
                
                return (
                  <div 
                    key={language.id} 
                    className="group bg-background dark:bg-neutral-800 rounded-2xl shadow-lg border-2 border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => handleStartLearning(language.id)}
                  >
                    <div className={`relative h-40 bg-gradient-to-br ${gradientMap[language.code] || "from-primary to-secondary"}`}>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-7xl transform group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
                          {language.flag}
                        </div>
                      </div>
                      {userLanguage && (
                        <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold shadow-md">
                          Level {userLanguage.level}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h3 className="font-bold text-2xl mb-2 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {language.name}
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-5 text-center leading-relaxed min-h-[3rem]">
                        {language.description || `Learn ${language.name} with our interactive lessons`}
                      </p>
                      
                      {userLanguage ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-neutral-500 dark:text-neutral-400">Progress</span>
                              <span className="text-primary font-bold">{userLanguage.progress}%</span>
                            </div>
                            <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden shadow-inner">
                              <div 
                                className="h-3 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 shadow-sm"
                                style={{ width: `${userLanguage.progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <Button 
                            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md hover:shadow-lg transition-all font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartLearning(language.id);
                            }}
                            disabled={enrollLanguageMutation.isPending}
                          >
                            {enrollLanguageMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Enrolling...
                              </>
                            ) : (
                              "Continue Learning"
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md hover:shadow-lg transition-all font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartLearning(language.id);
                          }}
                          disabled={enrollLanguageMutation.isPending}
                        >
                          {enrollLanguageMutation.isPending ? (
                            <>
                              <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Enrolling...
                            </>
                          ) : (
                            <>
                              <PlusCircle className="mr-2 h-5 w-5" />
                              Start Learning
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl shadow-lg border-2 border-neutral-200 dark:border-neutral-700 p-12 text-center animate-in fade-in zoom-in duration-500">
              <div className="text-6xl mb-4">🌍</div>
              <h3 className="text-2xl font-bold mb-3">No Languages Available</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                We're working on adding more languages. Check back soon!
              </p>
            </div>
          )}
        </>
      )}
      
      {activeLanguage && (
        <>
          <Button
            variant="ghost"
            className="mb-6 hover:bg-neutral-100 dark:hover:bg-neutral-800 animate-in fade-in duration-300"
            onClick={() => {
              setActiveLanguageId(null);
              setLocation('/lessons');
            }}
          >
            ← Back to All Languages
          </Button>
          
          <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl border-2 border-primary/20 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="text-5xl">{activeLanguage.flag}</div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {activeLanguage.name}
              </h3>
            </div>
            <p className="text-center text-neutral-600 dark:text-neutral-400">
              {activeLanguage.description}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <Tabs 
              value={activeLevel} 
              onValueChange={setActiveLevel}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-neutral-100 dark:bg-neutral-800 p-1">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  All Levels
                </TabsTrigger>
                {getLevelGroups().map(level => (
                  <TabsTrigger 
                    key={level} 
                    value={level.toString()}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    Level {level}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {isLoadingUserLessons ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredLessons && filteredLessons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLessons.map((userLesson: UserLesson & { lesson: Lesson }, index: number) => (
                <div 
                  key={userLesson.lesson.id}
                  className="animate-in fade-in slide-in-from-bottom duration-500"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <LessonCard
                    lesson={userLesson.lesson}
                    language={activeLanguage}
                    completed={userLesson.isCompleted}
                    progress={userLesson.progress}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl shadow-lg border-2 border-neutral-200 dark:border-neutral-700 p-12 text-center animate-in fade-in zoom-in duration-500">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold mb-3">No Lessons Yet</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                No lessons found for the selected level. Try another level or check back later as we add more content.
              </p>
              <Button 
                variant="outline"
                onClick={() => setActiveLevel("all")}
                className="shadow-md hover:shadow-lg transition-all"
              >
                View All Levels
              </Button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
