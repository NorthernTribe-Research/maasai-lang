import { cn } from "@/lib/utils";
import { Achievement } from "@shared/schema";

interface AchievementCardProps {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: Date;
}

export default function AchievementCard({ achievement, earned, earnedAt }: AchievementCardProps) {
  return (
    <div className={cn(
      "bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4 text-center",
      { "opacity-60": !earned }
    )}>
      <div className={cn(
        "w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center",
        earned 
          ? "bg-primary-light dark:bg-primary/20"
          : "bg-neutral-200 dark:bg-neutral-700"
      )}>
        <i className={`bx ${achievement.icon} text-3xl ${earned ? "text-primary" : "text-neutral-400 dark:text-neutral-500"}`}></i>
      </div>
      <h4 className="font-semibold mb-1">{achievement.name}</h4>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {achievement.description}
      </p>
      {earned && earnedAt && (
        <p className="text-xs text-primary mt-2 font-medium">
          Earned on {new Date(earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
