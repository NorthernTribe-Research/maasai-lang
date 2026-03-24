import { Book, Crown, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnitHeaderProps {
  title: string;
  description: string;
  unitNumber: number;
  legendaryEligible?: boolean;
  isLegendary?: boolean;
  canAttemptLegendary?: boolean;
  legendaryAccessMode?: "gems" | "unlimited" | "blocked" | "completed";
  legendaryGemCost?: number;
  gemsRequired?: number;
  onLegendaryAttempt?: () => void;
  isLegendaryPending?: boolean;
}

export function UnitHeader({
  title,
  description,
  unitNumber,
  legendaryEligible = false,
  isLegendary = false,
  canAttemptLegendary = false,
  legendaryAccessMode = "blocked",
  legendaryGemCost = 100,
  gemsRequired = 0,
  onLegendaryAttempt,
  isLegendaryPending = false,
}: UnitHeaderProps) {
  const showLegendaryPanel = legendaryEligible || isLegendary;
  const legendaryButtonDisabled =
    isLegendary || !canAttemptLegendary || !onLegendaryAttempt || isLegendaryPending;

  const legendaryButtonText = isLegendary
    ? "Legendary Complete"
    : legendaryAccessMode === "unlimited"
    ? "Start Legendary (FREE)"
    : legendaryAccessMode === "gems"
    ? `Start Legendary (${legendaryGemCost} Gems)`
    : `Need ${gemsRequired || legendaryGemCost} Gems`;

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Book className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white/80 uppercase tracking-wide mb-1">
            Unit {unitNumber}
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">{title}</h2>
          <p className="text-white/90 text-sm leading-relaxed">{description}</p>
          {!legendaryEligible && !isLegendary && (
            <p className="text-white/80 text-xs mt-2">
              Complete this unit to unlock Legendary challenge.
            </p>
          )}
        </div>

        {showLegendaryPanel && (
          <div className="flex-shrink-0 bg-white/15 rounded-xl p-3 border border-white/20 min-w-[180px]">
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
              <Crown className="h-4 w-4" />
              Legendary
            </div>
            <Button
              onClick={onLegendaryAttempt}
              disabled={legendaryButtonDisabled}
              className="w-full h-9 font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 disabled:opacity-60"
            >
              {isLegendaryPending ? "Processing..." : legendaryButtonText}
            </Button>
            {!isLegendary && legendaryAccessMode === "gems" && (
              <p className="text-[11px] text-white/85 mt-2 flex items-center gap-1">
                <Gem className="h-3 w-3" />
                Gems are consumed per legendary activation.
              </p>
            )}
            {isLegendary && (
              <p className="text-[11px] text-white/85 mt-2">
                This unit has been upgraded to Legendary.
              </p>
            )}
            {!isLegendary && legendaryAccessMode === "unlimited" && (
              <p className="text-[11px] text-white/85 mt-2">
                Premium active: unlimited legendary attempts.
              </p>
            )}
            {!isLegendary && legendaryAccessMode === "blocked" && (
              <p className="text-[11px] text-white/85 mt-2">
                You need more gems to start legendary.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
