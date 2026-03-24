import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LessonCompleteModalProps {
  open: boolean;
  onClose: () => void;
  xpEarned: number;
  streakDays: number;
  accuracyPercent: number;
  newAchievements?: string[];
}

export function LessonCompleteModal({
  open,
  onClose,
  xpEarned,
  streakDays,
  accuracyPercent,
  newAchievements = [],
}: LessonCompleteModalProps) {
  const [animatedXP, setAnimatedXP] = useState(0);

  useEffect(() => {
    if (open) {
      // Animate XP count-up
      let current = 0;
      const increment = Math.ceil(xpEarned / 20);
      const timer = setInterval(() => {
        current += increment;
        if (current >= xpEarned) {
          setAnimatedXP(xpEarned);
          clearInterval(timer);
        } else {
          setAnimatedXP(current);
        }
      }, 50);
      return () => clearInterval(timer);
    }
  }, [open, xpEarned]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-primary to-primary/90 border-none text-white">
        <div className="text-center py-6">
          {/* Trophy Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <Trophy className="h-12 w-12 text-yellow-300" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-extrabold mb-2">Lesson Complete!</h2>
          <p className="text-white/80 text-lg mb-8">Great job!</p>

          {/* Stats */}
          <div className="space-y-4 mb-8">
            {/* XP Earned */}
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-yellow-400 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-yellow-900" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white/70">Total XP</p>
                    <p className="text-2xl font-bold">{animatedXP}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-orange-400 flex items-center justify-center">
                    <Flame className="h-6 w-6 text-orange-900" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white/70">Streak</p>
                    <p className="text-2xl font-bold">{streakDays} days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-400 flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white/70">Accuracy</p>
                    <p className="text-2xl font-bold">{accuracyPercent}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Achievements */}
          {newAchievements.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-white/70 mb-3">New Achievements!</p>
              <div className="flex gap-2 justify-center">
                {newAchievements.map((achievement, i) => (
                  <div
                    key={i}
                    className="h-16 w-16 rounded-full bg-yellow-400 flex items-center justify-center text-2xl shadow-lg animate-bounce"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    🏆
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={onClose}
            className="w-full bg-white text-primary hover:bg-gray-100 font-bold text-lg py-6 rounded-2xl shadow-lg"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
