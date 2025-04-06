import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import LessonCard from "@/components/common/lesson-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function Lessons() {
  const { user } = useAuth();
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
  const { data: allLanguages, isLoading: isLoadingLanguages } = useQuery({
    queryKey: ["/api/languages"],
  });
  
  // Fetch user's languages
  const { data: userLanguages, isLoading: isLoadingUserLanguages } = useQuery({
    queryKey: ["/api/user/languages"],
    enabled: !!user,
  });
  
  // Fetch lessons for the active language
  const { data: languageLessons, isLoading: isLoadingLessons } = useQuery({
    queryKey: ["/api/languages", parseInt(activeLanguageId || "0"), "lessons"],
    enabled: !!activeLanguageId && parseInt(activeLanguageId) > 0,
  });
  
  // Fetch user lessons for the active language
  const { data: userLessons, isLoading: isLoadingUserLessons } = useQuery({
    queryKey: ["/api/user/languages", parseInt(activeLanguageId || "0"), "lessons"],
    enabled: !!activeLanguageId && parseInt(activeLanguageId) > 0 && !!user,
  });
  
  // Handle language change
  const handleLanguageChange = (value: string) => {
    setActiveLanguageId(value);
    setLocation(`/lessons?languageId=${value}`);
  };
  
  // Filter lessons by level
  const filteredLessons = userLessons?.filter(lesson => {
    if (activeLevel === "all") return true;
    return lesson.lesson.level.toString() === activeLevel;
  });
  
  // Group lessons by level
  const getLevelGroups = () => {
    if (!userLessons) return [];
    
    const levels = [...new Set(userLessons.map(ul => ul.lesson.level))].sort();
    return levels;
  };
  
  // Find active language object
  const activeLanguage = allLanguages?.find(lang => lang.id.toString() === activeLanguageId);
  
  return (
    <Layout>
      <div className="mb-6 flex flex-col md:flex-row justify-between md:items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            {activeLanguage 
              ? `${activeLanguage.name} Lessons` 
              : "Choose a Language"}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            {activeLanguage 
              ? `Progress through your ${activeLanguage.name} learning path` 
              : "Select a language to start or continue your learning journey"}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 md:ml-4 w-full md:w-64">
          <Select value={activeLanguageId || ""} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingLanguages ? (
                <SelectItem value="loading" disabled>Loading languages...</SelectItem>
              ) : allLanguages?.map(language => (
                <SelectItem key={language.id} value={language.id.toString()}>
                  {language.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {!activeLanguage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {isLoadingLanguages ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-60 w-full rounded-xl" />
            ))
          ) : allLanguages?.map(language => {
            const userLanguage = userLanguages?.find(ul => ul.languageId === language.id);
            return (
              <div 
                key={language.id} 
                className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className={`relative h-32 bg-gradient-to-r ${
                  language.code === "es" ? "from-orange-500 to-yellow-500" :
                  language.code === "zh" ? "from-red-500 to-red-700" :
                  language.code === "en" ? "from-blue-500 to-indigo-500" :
                  language.code === "hi" ? "from-green-500 to-emerald-500" :
                  language.code === "ar" ? "from-purple-500 to-fuchsia-500" :
                  "from-primary to-secondary"
                }`}>
                  <div className="absolute inset-0 bg-black/30"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img 
                      src={language.flag}
                      alt={`${language.name} flag`}
                      className="w-20 h-20 rounded-full border-4 border-white"
                    />
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-xl mb-2 text-center">{language.name}</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4 text-center">
                    {language.description || `Learn ${language.name} with our interactive lessons`}
                  </p>
                  
                  {userLanguage ? (
                    <div className="space-y-3">
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                        <div 
                          className="h-2 bg-primary rounded-full" 
                          style={{ width: `${userLanguage.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                          Level {userLanguage.level}
                        </span>
                        <span className="font-medium">
                          {userLanguage.progress}% complete
                        </span>
                      </div>
                      <Button 
                        className="w-full bg-primary hover:bg-primary-hover"
                        onClick={() => handleLanguageChange(language.id.toString())}
                      >
                        Continue Learning
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => handleLanguageChange(language.id.toString())}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Start Learning
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {activeLanguage && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <Tabs 
              value={activeLevel} 
              onValueChange={setActiveLevel}
              className="w-full sm:w-auto"
            >
              <TabsList>
                <TabsTrigger value="all">All Levels</TabsTrigger>
                {getLevelGroups().map(level => (
                  <TabsTrigger key={level} value={level.toString()}>
                    Level {level}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {isLoadingUserLessons ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-56 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredLessons && filteredLessons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLessons.map(userLesson => (
                <LessonCard
                  key={userLesson.lesson.id}
                  lesson={userLesson.lesson}
                  language={activeLanguage}
                  completed={userLesson.isCompleted}
                  progress={userLesson.progress}
                />
              ))}
            </div>
          ) : (
            <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 text-center">
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                No lessons found for the selected level. Try another level or check back later.
              </p>
              <Button 
                variant="outline"
                onClick={() => setActiveLevel("all")}
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
