import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserLanguage, Language } from "@shared/schema";

interface LanguagePathCardProps {
  userLanguage: UserLanguage & { language: Language };
  lessons: { completed: number; total: number };
}

export default function LanguagePathCard({ userLanguage, lessons }: LanguagePathCardProps) {
  const { language, level, progress } = userLanguage;
  
  // Generate a gradient color based on the language
  const getGradient = (code: string) => {
    switch (code) {
      case "es":
        return "from-orange-500 to-yellow-500";
      case "zh":
        return "from-red-500 to-red-700";
      case "en":
        return "from-blue-500 to-indigo-500";
      case "hi":
        return "from-green-500 to-emerald-500";
      case "ar":
        return "from-purple-500 to-fuchsia-500";
      default:
        return "from-primary to-secondary";
    }
  };

  // Determine level text
  const getLevelText = (level: number) => {
    switch (level) {
      case 1:
        return "Beginner";
      case 2:
        return "Elementary";
      case 3:
        return "Intermediate";
      case 4:
        return "Advanced";
      case 5:
        return "Proficient";
      default:
        return "Beginner";
    }
  };

  const remainingLessons = lessons.total - lessons.completed;

  return (
    <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className={`relative h-24 bg-gradient-to-r ${getGradient(language.code)}`}>
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute bottom-0 left-0 p-4 flex items-center">
          <img
            src={language.flag}
            alt={`${language.name} flag`}
            className="w-10 h-10 rounded-full border-2 border-white mr-3"
          />
          <h4 className="text-white font-bold text-xl">{language.name}</h4>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              Level {level}:
            </span> {getLevelText(level)}
          </div>
          <div className="text-sm font-medium">
            <span className="text-primary">{progress}%</span> complete
          </div>
        </div>

        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full mb-4">
          <div
            className="h-2 bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              Next: {lessons.completed < lessons.total ? "Continue Learning" : "Review Practice"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {remainingLessons > 0
                ? `${remainingLessons} lesson${remainingLessons !== 1 ? "s" : ""} remaining`
                : "All lessons completed!"}
            </p>
          </div>
          <Link href={`/lessons?languageId=${language.id}`}>
            <Button 
              className={remainingLessons > 0 ? "bg-primary hover:bg-primary-hover" : "bg-secondary hover:bg-secondary-hover"} 
              size="sm"
            >
              Continue
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
