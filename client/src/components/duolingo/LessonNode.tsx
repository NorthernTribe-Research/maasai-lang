import { Lock, Check, Crown, Book, Trophy, Dumbbell, Star, Headphones, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lesson } from "./LearningPath";

interface LessonNodeProps {
  lesson: Lesson;
  isActive: boolean;
  onClick: () => void;
}

export function LessonNode({ lesson, isActive, onClick }: LessonNodeProps) {
  const isLocked = lesson.state === "locked";
  const isCompleted = lesson.state === "completed" || lesson.state === "legendary";
  const isAvailable = lesson.state === "available" || lesson.state === "in-progress";

  const getIcon = () => {
    if (isLocked) return <Lock className="h-7 w-7" />;
    if (lesson.state === "legendary") return <Crown className="h-7 w-7" />;
    if (isCompleted) return <Star className="h-7 w-7 fill-current" />;

    switch (lesson.type) {
      case "story":
        return <Book className="h-7 w-7" />;
      case "review":
        return <Trophy className="h-7 w-7" />;
      case "practice":
        return <Dumbbell className="h-7 w-7" />;
      case "legendary":
        return <Crown className="h-7 w-7" />;
      default:
        return <Star className="h-7 w-7" />;
    }
  };

  const getNodeColor = () => {
    if (isLocked) return "bg-gray-200 dark:bg-gray-700 text-gray-400 border-4 border-gray-300 dark:border-gray-600";
    if (lesson.state === "legendary") return "bg-gradient-to-br from-purple-500 to-purple-700 text-white border-4 border-purple-300";
    if (isCompleted) return "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white border-4 border-yellow-300";

    switch (lesson.type) {
      case "story":
        return "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-4 border-blue-300";
      case "review":
        return "bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-4 border-yellow-300";
      case "practice":
        return "bg-gradient-to-br from-orange-500 to-red-500 text-white border-4 border-orange-300";
      case "legendary":
        return "bg-gradient-to-br from-purple-500 to-purple-700 text-white border-4 border-purple-300";
      default:
        return "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-4 border-primary/30";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "relative flex flex-col items-center group transition-transform",
        !isLocked && "hover:scale-105 cursor-pointer",
        isLocked && "cursor-not-allowed opacity-60",
        isActive && "animate-pulse"
      )}
    >
      {/* Node Circle */}
      <div
        className={cn(
          "h-20 w-20 rounded-full flex items-center justify-center shadow-xl transition-all",
          getNodeColor(),
          isActive && "ring-4 ring-primary/50 ring-offset-4 scale-110",
          !isLocked && "hover:scale-105 active:scale-95"
        )}
      >
        {getIcon()}
      </div>

      {/* Lesson Title */}
      <div className="mt-2 text-center max-w-[100px]">
        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 line-clamp-2">
          {lesson.title}
        </p>
        {!isLocked && !isCompleted && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            +{lesson.xpReward} XP
          </p>
        )}
      </div>

      {/* Progress Indicator for In-Progress */}
      {lesson.state === "in-progress" && (
        <div className="absolute -top-1 -right-1 h-7 w-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white dark:border-gray-900">
          ½
        </div>
      )}
    </button>
  );
}
