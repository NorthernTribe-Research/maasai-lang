import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  progress?: number; // 0-100 percentage toward unlock
  unlockedAt?: Date;
  className?: string;
}

export default function AchievementCard({
  achievement,
  unlocked,
  progress = 0,
  unlockedAt,
  className,
}: AchievementCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-lg",
        unlocked
          ? "bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30"
          : "bg-muted/50 opacity-75 hover:opacity-90",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Achievement Icon */}
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
              unlocked
                ? "bg-gradient-to-br from-primary to-secondary shadow-lg"
                : "bg-muted"
            )}
          >
            {unlocked ? (
              <i
                className={`bx ${achievement.icon} text-3xl text-primary-foreground`}
              ></i>
            ) : (
              <Lock className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Achievement Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4
                className={cn(
                  "font-bold text-lg",
                  unlocked ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {achievement.name}
              </h4>
              {unlocked && (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              )}
            </div>

            <p
              className={cn(
                "text-sm mb-3",
                unlocked ? "text-muted-foreground" : "text-muted-foreground/70"
              )}
            >
              {achievement.description}
            </p>

            {/* Unlock Status */}
            {unlocked ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Unlocked
                </Badge>
                {unlockedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(unlockedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <div>
                {/* Progress toward unlock */}
                {progress > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
                {progress === 0 && (
                  <Badge variant="outline" className="border-muted-foreground/30">
                    Locked
                  </Badge>
                )}
              </div>
            )}

            {/* Condition hint */}
            {!unlocked && (
              <p className="text-xs text-muted-foreground/60 mt-2 italic">
                {achievement.condition}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
