import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Lesson, Language } from "@shared/schema";

interface LessonCardProps {
  lesson: Lesson;
  language: Language;
  completed?: boolean;
  progress?: number;
}

export default function LessonCard({ lesson, language, completed = false, progress = 0 }: LessonCardProps) {
  // Get background color based on lesson type
  const getBgColor = (type: string) => {
    switch (type) {
      case "vocabulary":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "grammar":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
      case "conversation":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  // Get icon based on lesson type
  const getIcon = (icon: string | undefined) => {
    if (icon) return icon;
    
    switch (lesson.type) {
      case "vocabulary":
        return "bx-book";
      case "grammar":
        return "bx-pencil";
      case "conversation":
        return "bx-conversation";
      default:
        return "bx-book-open";
    }
  };

  return (
    <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center">
          <img
            src={language.flag}
            alt={`${language.name} flag`}
            className="w-6 h-6 rounded-full mr-2"
          />
          <span className="font-semibold">{language.name}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getBgColor(lesson.type)}`}>
          {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center mb-2">
          <i className={`bx ${getIcon(lesson.icon)} text-2xl text-secondary mr-2`}></i>
          <h4 className="font-semibold">{lesson.title}</h4>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          {lesson.description}
        </p>

        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {lesson.duration} min • {lesson.xpReward} XP
          </span>
          <Link href={`/lessons/${lesson.id}`}>
            <Button 
              className={`px-3 py-1.5 text-sm ${
                completed 
                  ? "bg-secondary hover:bg-secondary-hover" 
                  : "bg-primary hover:bg-primary-hover"
              }`}
            >
              {completed ? "Review" : progress > 0 ? "Continue" : "Start Lesson"}
            </Button>
          </Link>
        </div>
        
        {progress > 0 && progress < 100 && (
          <div className="mt-2 w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
            <div
              className="h-1.5 bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
