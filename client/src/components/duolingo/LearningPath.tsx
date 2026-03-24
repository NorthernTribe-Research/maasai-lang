import { useState } from "react";
import { LessonNode } from "./LessonNode";
import { UnitHeader } from "./UnitHeader";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export interface Lesson {
  id: string;
  title: string;
  type: "lesson" | "story" | "review" | "legendary" | "practice";
  state: "locked" | "available" | "in-progress" | "completed" | "legendary";
  xpReward: number;
  position: "left" | "center" | "right";
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  legendaryEligible?: boolean;
  isLegendary?: boolean;
  canAttemptLegendary?: boolean;
  legendaryAccessMode?: "gems" | "unlimited" | "blocked" | "completed";
  legendaryGemCost?: number;
  gemsBalance?: number;
  gemsRequired?: number;
  hasUnlimitedLegendary?: boolean;
}

interface LearningPathProps {
  units: Unit[];
  currentLessonId?: string;
  onLessonClick: (lessonId: string) => void;
  onLegendaryAttempt?: (unitId: string) => void;
  legendaryPendingUnitId?: string | null;
}

export function LearningPath({
  units,
  currentLessonId,
  onLessonClick,
  onLegendaryAttempt,
  legendaryPendingUnitId,
}: LearningPathProps) {
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToCurrent = () => {
    const currentElement = document.getElementById(`lesson-${currentLessonId}`);
    currentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto pb-20">
      {/* Learning Path */}
      <div className="space-y-12 px-4">
        {units.map((unit, unitIndex) => (
          <div key={unit.id} className="relative">
            <UnitHeader
              title={unit.title}
              description={unit.description}
              unitNumber={unitIndex + 1}
              legendaryEligible={unit.legendaryEligible}
              isLegendary={unit.isLegendary}
              canAttemptLegendary={unit.canAttemptLegendary}
              legendaryAccessMode={unit.legendaryAccessMode}
              legendaryGemCost={unit.legendaryGemCost}
              gemsRequired={unit.gemsRequired}
              onLegendaryAttempt={
                onLegendaryAttempt
                  ? () => onLegendaryAttempt(unit.id)
                  : undefined
              }
              isLegendaryPending={legendaryPendingUnitId === unit.id}
            />

            {/* Lesson Nodes */}
            <div className="relative mt-8 space-y-8">
              {unit.lessons.map((lesson, lessonIndex) => {
                const nextLesson = unit.lessons[lessonIndex + 1];
                const hasConnector = lessonIndex < unit.lessons.length - 1;

                return (
                  <div key={lesson.id} id={`lesson-${lesson.id}`} className="relative">
                    <div
                      className={`flex ${
                        lesson.position === "left"
                          ? "justify-start pl-8"
                          : lesson.position === "right"
                          ? "justify-end pr-8"
                          : "justify-center"
                      }`}
                    >
                      <LessonNode
                        lesson={lesson}
                        isActive={lesson.id === currentLessonId}
                        onClick={() => onLessonClick(lesson.id)}
                      />
                    </div>

                    {/* Connector Line to Next Lesson */}
                    {hasConnector && nextLesson && (
                      <svg
                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                        style={{ top: "100px", height: "40px" }}
                        width="200"
                        height="40"
                      >
                        <path
                          d={`M 100 0 Q ${
                            nextLesson.position === "left"
                              ? "50"
                              : nextLesson.position === "right"
                              ? "150"
                              : "100"
                          } 20 ${
                            nextLesson.position === "left"
                              ? "40"
                              : nextLesson.position === "right"
                              ? "160"
                              : "100"
                          } 40`}
                          stroke="#E5E7EB"
                          strokeWidth="4"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Scroll to Current Button */}
      {showScrollButton && currentLessonId && (
        <Button
          onClick={scrollToCurrent}
          className="fixed bottom-24 right-6 rounded-full h-14 w-14 shadow-lg"
          size="icon"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
