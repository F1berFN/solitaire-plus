import { Button } from "@/components/ui/button";
import { RotateCcw, RotateCw, Lightbulb, Settings } from "lucide-react";

interface GameControlsProps {
  onRestart: () => void;
  onUndo: () => void;
  onHint: () => void;
  onSettings: () => void;
  hintsRemaining: number;
  canUndo: boolean;
}

export function GameControls({
  onRestart,
  onUndo,
  onHint,
  onSettings,
  hintsRemaining,
  canUndo,
}: GameControlsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onRestart}
        className="gap-1.5 text-xs"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Restart</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        className="gap-1.5 text-xs"
      >
        <RotateCw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Undo</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onHint}
        disabled={hintsRemaining === 0}
        className="gap-1.5 text-xs"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Hint</span>
        <span className="text-xs opacity-60">({hintsRemaining})</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onSettings}
        className="gap-1.5 text-xs"
      >
        <Settings className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Settings</span>
      </Button>
    </div>
  );
}
