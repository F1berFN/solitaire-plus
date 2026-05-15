import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGameState } from "../game/useGameState";
import { GameBoard } from "../components/GameBoard";
import { ScoreBreakdownModal } from "../components/ScoreBreakdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, ArrowLeft, Trophy, Clock, CheckCircle } from "lucide-react";
import type { ScoreBreakdown } from "@shared/gameTypes";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";

export default function DailyChallengePage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [finalBreakdown, setFinalBreakdown] = useState<ScoreBreakdown | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: dailyData, isLoading } = trpc.daily.get.useQuery();
  const submitChallenge = trpc.daily.submit.useMutation();

  const handleGameComplete = useCallback(async (breakdown: ScoreBreakdown, won: boolean) => {
    setFinalBreakdown(breakdown);
    setGameWon(won);
    setShowBreakdown(true);
    if (timerRef.current) clearInterval(timerRef.current);

    if (isAuthenticated) {
      try {
        await submitChallenge.mutateAsync({
          score: breakdown.total,
          durationSecs: breakdown.durationSecs,
          moves: breakdown.moves,
          hintsUsed: gameState.state?.hintsUsed ?? 0,
          won,
        });
        if (won) toast.success("Daily challenge completed! Score submitted.");
      } catch (e) {
        toast.error("Failed to submit score");
      }
    }
  }, [isAuthenticated, submitChallenge]);

  const gameState = useGameState(handleGameComplete);

  const handleStartGame = useCallback(() => {
    if (!dailyData?.challenge) return;
    gameState.startGame(dailyData.challenge.seed, dailyData.challenge.drawMode, null);
    setGameStarted(true);
    setElapsedSecs(0);
    timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
  }, [dailyData, gameState]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Already submitted
  if (dailyData?.userEntry) {
    return (
      <div className="game-table min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm animate-scale-in">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-2">Already Completed!</h2>
          <p className="text-muted-foreground mb-2">{today}</p>
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="text-4xl font-bold font-mono text-primary mb-1">
              {dailyData.userEntry.score.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Your score</div>
            <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <span>{dailyData.userEntry.moves} moves</span>
              <span>·</span>
              <span>{formatTime(dailyData.userEntry.durationSecs)}</span>
              <span>·</span>
              <span className={dailyData.userEntry.won ? "text-green-400" : "text-red-400"}>
                {dailyData.userEntry.won ? "Won" : "Lost"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/leaderboard")}>
              <Trophy className="w-4 h-4 mr-2" /> Leaderboard
            </Button>
            <Button className="flex-1" onClick={() => navigate("/")}>
              Play More
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-game screen
  if (!gameStarted) {
    return (
      <div className="game-table min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-scale-in">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <Card>
            <CardContent className="pt-6 text-center space-y-6">
              <div>
                <div className="text-5xl mb-3">📅</div>
                <h1 className="text-3xl font-serif font-bold">Daily Challenge</h1>
                <p className="text-muted-foreground mt-2">{today}</p>
              </div>

              <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm text-left">
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Same shuffled deck for every player today</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Draw {dailyData?.challenge?.drawMode === "draw3" ? "3" : "1"} mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>One attempt per day — make it count!</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Compete on the daily leaderboard</span>
                </div>
              </div>

              {!isAuthenticated && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm text-yellow-300">
                  Sign in to save your score to the leaderboard!
                </div>
              )}

              <div className="flex gap-2">
                {!isAuthenticated && (
                  <Button variant="outline" className="flex-1"           onClick={() => window.location.href = getLoginUrl()}>
                    Sign In
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={handleStartGame}
                  disabled={isLoading || !dailyData?.challenge}
                >
                  {isLoading ? "Loading..." : "Start Challenge"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Active game
  return (
    <div className="game-table min-h-screen flex flex-col">
      {/* HUD */}
      <div className="game-hud sticky top-0 z-50">
        <div className="container py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Daily Challenge</span>
              <Badge variant="outline" className="text-xs hidden sm:flex">
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="font-bold font-mono text-primary">{gameState.state?.score ?? 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Time</div>
                <div className="font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(elapsedSecs)}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={gameState.undo}>Undo</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Quit</Button>
            </div>
          </div>
        </div>
      </div>

      {gameState.state && (
        <GameBoard
          state={gameState.state}
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

      <ScoreBreakdownModal
        open={showBreakdown}
        breakdown={finalBreakdown}
        won={gameWon}
        mode="daily"
        onPlayAgain={() => { setShowBreakdown(false); navigate("/"); }}
        onClose={() => { setShowBreakdown(false); navigate("/leaderboard"); }}
      />
    </div>
  );
}
