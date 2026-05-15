import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import type { AIDifficulty, DrawMode, GameMode, Theme, CardBack, ScoreBreakdown } from "@shared/gameTypes";
import { useGameState } from "../game/useGameState";
import { getAIFoundationCount } from "../game/aiEngine";
import { GameBoard } from "../components/GameBoard";
import { ScoreBreakdownModal } from "../components/ScoreBreakdown";
import { CoachPanel } from "../components/CoachPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGuestSession } from "@/hooks/useGuestSession";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Lightbulb, Undo2, RotateCcw, Settings, Bot, Trophy, Home,
  Zap, Clock, Star, ChevronRight
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ACHIEVEMENTS } from "@shared/achievements";

interface GameConfig {
  mode: GameMode;
  drawMode: DrawMode;
  theme: Theme;
  cardBack: CardBack;
  aiDifficulty?: AIDifficulty;
  seed?: string;
}

interface GamePageProps {
  config?: GameConfig;
  onExit?: () => void;
}

const MAX_HINTS = 3;

export default function GamePage({ config, onExit }: GamePageProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { session: guestSession } = useGuestSession();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [finalBreakdown, setFinalBreakdown] = useState<ScoreBreakdown | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [eloChange, setEloChange] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mode = config?.mode ?? "solo";
  const theme = config?.theme ?? "classic";
  const cardBack = config?.cardBack ?? "default";
  const aiDifficulty = config?.aiDifficulty ?? null;

  const saveResult = trpc.game.saveResult.useMutation();

  const handleGameComplete = useCallback(async (breakdown: ScoreBreakdown, won: boolean) => {
    setFinalBreakdown(breakdown);
    setGameWon(won);
    setShowBreakdown(true);
    if (timerRef.current) clearInterval(timerRef.current);

    if (user) {
      try {
        const result = await saveResult.mutateAsync({
          mode,
          drawMode: config?.drawMode ?? "draw1",
          seed: gameState.seed,
          score: breakdown.total,
          durationSecs: breakdown.durationSecs,
          moves: breakdown.moves,
          hintsUsed: gameState.state?.hintsUsed ?? 0,
          won,
          theme,
          aiDifficulty: aiDifficulty ?? undefined,
        });
        if (result.eloChange) {
          setEloChange(result.eloChange);
        }
        if (result.newAchievements.length > 0) {
          setNewAchievements(result.newAchievements);
          result.newAchievements.forEach((key) => {
            const def = ACHIEVEMENTS.find((a) => a.key === key);
            if (def) {
              toast.custom(() => (
                <div className="achievement-toast rounded-xl p-4 flex items-center gap-3">
                  <span className="text-3xl">{def.icon}</span>
                  <div>
                    <div className="font-bold text-yellow-300 text-sm">Achievement Unlocked!</div>
                    <div className="text-white font-semibold">{def.name}</div>
                    <div className="text-white/70 text-xs">{def.description}</div>
                  </div>
                </div>
              ), { duration: 5000 });
            }
          });
        }
      } catch (e) {
        // Silently fail - don't interrupt game flow
      }
    }
  }, [user, mode, config, theme, aiDifficulty, saveResult]);

  const gameState = useGameState(handleGameComplete);

  // Start game on mount
  useEffect(() => {
    gameState.startGame(config?.seed, config?.drawMode ?? "draw1", aiDifficulty);
    setElapsedSecs(0);
    setShowBreakdown(false);
    setNewAchievements([]);
  }, []);

  // Timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSecs((s) => s + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.seed]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleNewGame = useCallback(() => {
    gameState.startGame(undefined, config?.drawMode ?? "draw1", aiDifficulty);
    setElapsedSecs(0);
    setShowBreakdown(false);
    setNewAchievements([]);
    setFinalBreakdown(null);
  }, [gameState, config, aiDifficulty]);

  const handleHint = useCallback(() => {
    if ((gameState.state?.hintsUsed ?? 0) >= MAX_HINTS) {
      toast.error("No hints remaining!");
      return;
    }
    gameState.useHint();
    toast.info("💡 Hint activated — look for the glowing card!");
  }, [gameState]);

  const aiFoundationCount = gameState.aiState ? getAIFoundationCount(gameState.aiState) : 0;
  const playerFoundationCount = gameState.state?.foundation.reduce((s, p) => s + p.length, 0) ?? 0;
  const hintsLeft = MAX_HINTS - (gameState.state?.hintsUsed ?? 0);

  return (
    <div className="game-table min-h-screen flex flex-col" data-theme={theme}>
      {/* HUD */}
      <div className="game-hud sticky top-0 z-50">
        <div className="container py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Nav */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onExit ? onExit() : navigate("/")} className="gap-1">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
              <Badge variant="outline" className="text-xs capitalize hidden sm:flex">
                {mode === "vsAI" ? `vs AI (${aiDifficulty})` : mode}
              </Badge>
            </div>

            {/* Center: Score + Stats */}
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="text-center hidden sm:block">
                <div className="text-xs text-muted-foreground">Player</div>
                <div className="font-mono font-bold leading-none text-sm">
                  {guestSession?.fullName ?? user?.name?.split(" ")[0] ?? "You"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="font-bold font-mono text-primary text-lg leading-none">
                  {gameState.state?.score ?? 0}
                </div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="text-xs text-muted-foreground">Moves</div>
                <div className="font-mono font-bold leading-none">{gameState.state?.moves ?? 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Time</div>
                <div className="font-mono font-bold leading-none flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(elapsedSecs)}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHint}
                disabled={hintsLeft === 0}
                className="gap-1 relative"
                title={`Hints: ${hintsLeft} remaining`}
              >
                <Lightbulb className="w-4 h-4" />
                <span className="text-xs font-bold">{hintsLeft}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={gameState.undo} title="Undo">
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCoach((v) => !v)}
                className={cn(showCoach && "text-primary")}
                title="AI Coach"
              >
                <Bot className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleNewGame}>
                    <RotateCcw className="w-4 h-4 mr-2" /> New Game
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onExit ? onExit() : navigate("/")}>
                    <Home className="w-4 h-4 mr-2" /> Main Menu
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/leaderboard")}>
                    <Trophy className="w-4 h-4 mr-2" /> Leaderboard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* AI Progress Bar */}
          {mode === "vsAI" && gameState.aiState && (
            <div className="mt-2 pb-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <Bot className="w-3 h-3" /> AI ({aiDifficulty})
                  <span className="font-mono ml-1">{aiFoundationCount}/52</span>
                </span>
                <span className="flex items-center gap-1">
                  You: <span className="font-mono">{playerFoundationCount}/52</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">AI</div>
                  <Progress value={(aiFoundationCount / 52) * 100} className="h-1.5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">You</div>
                  <Progress value={(playerFoundationCount / 52) * 100} className="h-1.5" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Area */}
      <div className={cn("flex flex-1 relative", showCoach && "pr-0 sm:pr-80")}>
        <div className="flex-1 overflow-auto">
          {gameState.state && (
            <GameBoard
              state={gameState.state}
              cardBack={cardBack}
              hint={gameState.hint}
              onDraw={gameState.draw}
              onMoveWasteToTableau={gameState.moveWasteToTableau}
              onMoveWasteToFoundation={gameState.moveWasteToFoundation}
              onMoveTableauToFoundation={gameState.moveTableauToFoundation}
              onMoveTableauToTableau={gameState.moveTableauToTableau}
              onMoveFoundationToTableau={gameState.moveFoundationToTableau}
              onAutoComplete={gameState.triggerAutoComplete}
            />
          )}
        </div>

        {/* Coach Panel */}
        {showCoach && (
          <div className="fixed right-0 top-0 bottom-0 w-80 z-40 pt-16">
            <CoachPanel
              getBoardState={gameState.getBoardForLLM}
              moveCount={gameState.state?.moves ?? 0}
              score={gameState.state?.score ?? 0}
              hintsUsed={gameState.state?.hintsUsed ?? 0}
              mode={mode}
              onClose={() => setShowCoach(false)}
            />
          </div>
        )}
      </div>

      {/* Score Breakdown Modal */}
      <ScoreBreakdownModal
        open={showBreakdown}
        breakdown={finalBreakdown}
        won={gameWon}
        mode={mode}
        onPlayAgain={handleNewGame}
        onClose={() => { setShowBreakdown(false); onExit ? onExit() : navigate("/"); }}
        newAchievements={newAchievements}
        eloChange={eloChange}
      />
    </div>
  );
}
