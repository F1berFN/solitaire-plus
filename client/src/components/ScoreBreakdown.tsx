import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ScoreBreakdown } from "@shared/gameTypes";
import { cn } from "@/lib/utils";

interface ScoreBreakdownModalProps {
  open: boolean;
  breakdown: ScoreBreakdown | null;
  won: boolean;
  mode: string;
  onPlayAgain: () => void;
  onClose: () => void;
  newAchievements?: string[];
  eloChange?: number;
}

function ScoreRow({ label, value, positive = true, highlight = false }: {
  label: string;
  value: number;
  positive?: boolean;
  highlight?: boolean;
}) {
  const formatted = value === 0 ? "—" : (positive ? `+${value}` : `-${Math.abs(value)}`);
  return (
    <div className={cn(
      "flex justify-between items-center py-2 px-3 rounded-lg",
      highlight ? "bg-primary/10" : "bg-muted/30"
    )}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        "font-bold text-sm font-mono",
        value === 0 ? "text-muted-foreground" :
        positive ? "text-green-400" : "text-red-400",
        highlight && "text-primary text-base"
      )}>
        {formatted}
      </span>
    </div>
  );
}

export function ScoreBreakdownModal({
  open,
  breakdown,
  won,
  mode,
  onPlayAgain,
  onClose,
  newAchievements = [],
  eloChange = 0,
}: ScoreBreakdownModalProps) {
  if (!breakdown) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-serif">
            {won ? "🏆 Victory!" : "💔 Game Over"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Time</div>
              <div className="font-mono font-bold">{formatTime(breakdown.durationSecs)}</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Moves</div>
              <div className="font-mono font-bold">{breakdown.moves}</div>
            </div>
            {eloChange !== 0 && (
              <div className={cn("bg-muted/40 rounded-lg p-3 text-center", eloChange > 0 ? "border border-green-500/50" : "border border-red-500/50")}>
                <div className="text-xs text-muted-foreground mb-1">ELO</div>
                <div className={cn("font-mono font-bold", eloChange > 0 ? "text-green-400" : "text-red-400")}>
                  {eloChange > 0 ? "+" : ""}{eloChange}
                </div>
              </div>
            )}
          </div>

          {/* Score breakdown */}
          <div className="space-y-1.5">
            <ScoreRow label="Base Score" value={breakdown.baseScore} />
            <ScoreRow label="Time Bonus" value={breakdown.timeBonus} />
            <ScoreRow label="Efficiency Bonus" value={breakdown.comboBonus} />
            <ScoreRow label="Streak Bonus" value={breakdown.streakBonus} />
            {breakdown.hintPenalty > 0 && (
              <ScoreRow label="Hint Penalty" value={breakdown.hintPenalty} positive={false} />
            )}
            <div className="h-px bg-border my-1" />
            <ScoreRow label="Total Score" value={breakdown.total} highlight />
            {eloChange !== 0 && (
              <>
                <div className="h-px bg-border my-1" />
                <ScoreRow label="ELO Change" value={eloChange} positive={eloChange > 0} highlight />
              </>
            )}
          </div>

          {/* New achievements */}
          {newAchievements.length > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
              <div className="text-xs font-semibold text-yellow-400 mb-2">🎖 New Achievements!</div>
              <div className="space-y-1">
                {newAchievements.map((key) => (
                  <div key={key} className="text-sm text-foreground">
                    • {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Menu
          </Button>
          <Button className="flex-1" onClick={onPlayAgain}>
            Play Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
