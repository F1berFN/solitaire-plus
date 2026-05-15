import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMultiplayer } from "../game/useMultiplayer";
import { useGameState } from "../game/useGameState";
import { GameBoard } from "../components/GameBoard";
import { ScoreBreakdownModal } from "../components/ScoreBreakdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Users, Copy, ArrowLeft, Wifi, WifiOff, Crown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreBreakdown } from "@shared/gameTypes";
import { getLoginUrl } from "@/const";

export default function MultiplayerPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [finalBreakdown, setFinalBreakdown] = useState<ScoreBreakdown | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  const mp = useMultiplayer();
  const createRoom = trpc.multiplayer.createRoom.useMutation();
  const joinRoomMutation = trpc.multiplayer.joinRoom.useMutation();
  const saveResult = trpc.game.saveResult.useMutation();

  const handleGameComplete = useCallback(async (breakdown: ScoreBreakdown, won: boolean) => {
    setFinalBreakdown(breakdown);
    setGameWon(won);
    setShowBreakdown(true);
    if (currentRoom) {
      mp.sendComplete(currentRoom, breakdown.total, won);
    }
    if (user && currentRoom) {
      await saveResult.mutateAsync({
        mode: "vsPlayer",
        drawMode: mp.roomState?.drawMode ?? "draw1",
        seed: mp.roomState?.seed ?? "",
        score: breakdown.total,
        durationSecs: breakdown.durationSecs,
        moves: breakdown.moves,
        hintsUsed: gameState.state?.hintsUsed ?? 0,
        won,
        theme: "classic",
        opponentScore,
      });
    }
  }, [currentRoom, mp, user, opponentScore, saveResult]);

  const gameState = useGameState(handleGameComplete);

  // Track opponent moves via socket
  useEffect(() => {
    if (!mp.roomState) return;
    const myId = user?.id;
    if (!myId) return;
    const amHost = mp.roomState.hostId === myId;
    setOpponentProgress(amHost ? mp.roomState.guestProgress : mp.roomState.hostProgress);
    setOpponentScore(amHost ? mp.roomState.guestScore : mp.roomState.hostScore);
  }, [mp.roomState, user]);

  // Send progress updates as we play
  const playerFoundationCount = gameState.state?.foundation.reduce((s, p) => s + p.length, 0) ?? 0;
  useEffect(() => {
    if (mp.status === "playing" && currentRoom) {
      mp.sendMove(currentRoom, playerFoundationCount, gameState.state?.score ?? 0);
    }
  }, [playerFoundationCount, gameState.state?.score]);

  // Timer
  useEffect(() => {
    if (mp.status !== "playing") return;
    const interval = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [mp.status]);

  // Start game when room transitions to playing
  useEffect(() => {
    if (mp.status === "playing" && mp.roomState && !gameState.state) {
      gameState.startGame(mp.roomState.seed, mp.roomState.drawMode, null);
    }
  }, [mp.status, mp.roomState]);

  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    try {
      const room = await createRoom.mutateAsync({ drawMode: "draw1" });
      if (room) {
        setCurrentRoom(room.code);
        setIsHost(true);
        mp.joinRoom(room.code, user!.id, user!.name ?? "Player");
      }
    } catch (e) {
      toast.error("Failed to create room");
    }
  };

  const handleJoinRoom = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      await joinRoomMutation.mutateAsync({ code });
      setCurrentRoom(code);
      setIsHost(false);
      mp.joinRoom(code, user!.id, user!.name ?? "Player");
    } catch (e) {
      toast.error("Room not found or unavailable");
    }
  };

  const handleReady = () => {
    if (currentRoom) mp.setReady(currentRoom);
  };

  const copyCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom);
      toast.success("Room code copied!");
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ─── Lobby ────────────────────────────────────────────────────────────────

  if (!currentRoom || mp.status === "idle") {
    return (
      <div className="game-table min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 animate-scale-in">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🌐</div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Online Play</h1>
            <p className="text-muted-foreground mt-2">Race head-to-head on the same shuffled deck</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" /> Create a Room
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={handleCreateRoom} disabled={createRoom.isPending}>
                {createRoom.isPending ? "Creating..." : "Create New Room"}
              </Button>
            </CardContent>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Join a Room
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Enter room code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono text-center tracking-widest text-lg"
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              />
              <Button onClick={handleJoinRoom} disabled={joinRoomMutation.isPending}>
                Join
              </Button>
            </CardContent>
          </Card>

          <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  // ─── Waiting Room ─────────────────────────────────────────────────────────

  if (mp.status === "waiting" || mp.status === "connecting") {
    const room = mp.roomState;
    return (
      <div className="game-table min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-scale-in">
          <Card>
            <CardHeader className="text-center">
              <div className="text-3xl mb-2">🎮</div>
              <CardTitle className="text-2xl font-serif">Waiting Room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Room Code */}
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Room Code</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-mono font-bold tracking-widest text-primary">
                    {currentRoom}
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Share this code with your opponent</p>
              </div>

              {/* Players */}
              <div className="space-y-3">
                <div className={cn("flex items-center gap-3 p-3 rounded-lg", "bg-muted/40")}>
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <div className="flex-1">
                    <div className="font-semibold">{room?.hostName ?? "Host"}</div>
                    <div className="text-xs text-muted-foreground">Host</div>
                  </div>
                  <Badge variant="outline" className="text-green-400 border-green-400/40">Ready</Badge>
                </div>

                <div className={cn("flex items-center gap-3 p-3 rounded-lg", "bg-muted/40")}>
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-semibold">{room?.guestName ?? "Waiting..."}</div>
                    <div className="text-xs text-muted-foreground">Guest</div>
                  </div>
                  {room?.guestId ? (
                    <Badge variant="outline" className="text-green-400 border-green-400/40">Joined</Badge>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                      Waiting
                    </div>
                  )}
                </div>
              </div>

              {room?.guestId && (
                <Button className="w-full" onClick={handleReady}>
                  Ready to Play!
                </Button>
              )}

              <Button variant="ghost" className="w-full" onClick={() => {
                mp.leaveRoom(currentRoom);
                setCurrentRoom(null);
              }}>
                Leave Room
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Active Game ──────────────────────────────────────────────────────────

  const opponentName = isHost ? mp.roomState?.guestName : mp.roomState?.hostName;

  return (
    <div className="game-table min-h-screen flex flex-col">
      {/* HUD */}
      <div className="game-hud sticky top-0 z-50">
        <div className="container py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Room {currentRoom}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="font-bold font-mono text-primary">{gameState.state?.score ?? 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Time</div>
                <div className="font-mono font-bold">{formatTime(elapsedSecs)}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { mp.leaveRoom(currentRoom); navigate("/"); }}>
              Leave
            </Button>
          </div>

          {/* Progress bars */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>You</span>
                <span className="font-mono">{playerFoundationCount}/52</span>
              </div>
              <Progress value={(playerFoundationCount / 52) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{opponentName ?? "Opponent"}</span>
                <span className="font-mono">{opponentProgress}/52</span>
              </div>
              <Progress value={(opponentProgress / 52) * 100} className="h-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      {gameState.state && (
        <GameBoard
          state={gameState.state}
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
        mode="vsPlayer"
        onPlayAgain={() => { setShowBreakdown(false); navigate("/multiplayer"); }}
        onClose={() => { setShowBreakdown(false); navigate("/"); }}
      />
    </div>
  );
}
