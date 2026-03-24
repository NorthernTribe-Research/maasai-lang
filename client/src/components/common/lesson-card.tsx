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
  // Get background color based on lesson type with enhanced gradients
  const getBgColor = (type: string) => {
    switch (type) {
      case "vocabulary":
        return "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700";
      case "grammar":
        return "bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700";
      case "conversation":
        return "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700";
      case "pronunciation":
        return "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700";
      default:
        return "bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-900/40 dark:to-slate-900/40 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700";
    }
  };

  // Get icon based on lesson type
  const getIcon = (icon: string | undefined) => {
    if (icon) return icon;
    
    switch (lesson.type) {
      case "vocabulary":
        return "📚";
      case "grammar":
        return "✏️";
      case "conversation":
        return "💬";
      case "pronunciation":
        return "🗣️";
      default:
        return "📖";
    }
  };

  return (
    <div className="group bg-background dark:bg-neutral-800 rounded-2xl shadow-lg border-2 border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
      <div className="p-4 border-b-2 border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900">
        <div className="flex items-center gap-2">
          <div className="text-2xl">{language.flag}</div>
          <span className="font-bold text-lg">{language.name}</span>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 ${getBgColor(lesson.type)} shadow-sm`}>
          {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center mb-3">
          <div className="text-3xl mr-3 transform group-hover:scale-110 transition-transform">
            {getIcon(lesson.icon || undefined)}
          </div>
          <h4 className="font-bold text-lg leading-tight">{lesson.title}</h4>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed min-h-[3rem]">
          {lesson.description}
        </p>

        <div className="flex justify-between items-center mb-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 font-medium">
              ⏱️ {lesson.duration} min
            </span>
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-bold">
              ⭐ {lesson.xpReward} XP
            </span>
          </div>
          {completed && (
            <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
              ✓ Done
            </span>
          )}
        </div>
        
        {progress > 0 && progress < 100 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-medium mb-1">
              <span className="text-neutral-500 dark:text-neutral-400">Progress</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-2.5 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <Link href={`/lessons/${lesson.id}`}>
          <Button 
            className={`w-full font-semibold shadow-md hover:shadow-lg transition-all ${
              completed 
                ? "bg-gradient-to-r from-secondary to-secondary/80 hover:opacity-90" 
                : progress > 0
                ? "bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                : "bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            }`}
          >
            {completed ? "🔄 Review" : progress > 0 ? "▶️ Continue" : "🚀 Start Lesson"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
