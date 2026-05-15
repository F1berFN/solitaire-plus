import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  Play, Bot, Users, Calendar, Trophy, User, LogIn, Sparkles,
  Zap, Shield, Star, ChevronRight, Palette, Settings2, Smile
} from "lucide-react";
import type { Theme, CardBack, DrawMode, AIDifficulty, GameMode } from "@shared/gameTypes";
import { useGuestSession } from "@/hooks/useGuestSession";
import { GuestNameSelector } from "@/components/GuestNameSelector";
import { Footer } from "@/components/Footer";

interface GameConfig {
  mode: GameMode;
  drawMode: DrawMode;
  theme: Theme;
  cardBack: CardBack;
  aiDifficulty?: AIDifficulty;
}

const THEMES: { id: Theme; name: string; emoji: string; desc: string }[] = [
  { id: "classic", name: "Classic Green", emoji: "🎩", desc: "Timeless casino felt" },
  { id: "dark-neon", name: "Dark Neon", emoji: "⚡", desc: "Cyberpunk glow" },
  { id: "space", name: "Space", emoji: "🚀", desc: "Cosmic starfield" },
  { id: "nature", name: "Nature", emoji: "🌿", desc: "Forest tranquility" },
  { id: "retro-pixel", name: "Retro Pixel", emoji: "👾", desc: "8-bit nostalgia" },
];

const CARD_BACKS: { id: CardBack; name: string; emoji: string }[] = [
  { id: "default", name: "Classic", emoji: "🔵" },
  { id: "waves", name: "Waves", emoji: "🌊" },
  { id: "diamonds", name: "Diamonds", emoji: "💎" },
  { id: "stars", name: "Stars", emoji: "⭐" },
  { id: "pixels", name: "Pixels", emoji: "🟦" },
];

function NewGameModal({
  open,
  onClose,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  onStart: (config: GameConfig) => void;
}) {
  const [mode, setMode] = useState<GameMode>("solo");
  const [drawMode, setDrawMode] = useState<DrawMode>("draw1");
  const [theme, setTheme] = useState<Theme>("classic");
  const [cardBack, setCardBack] = useState<CardBack>("default");
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("medium");

  const handleStart = () => {
    onStart({ mode, drawMode, theme, cardBack, aiDifficulty: mode === "vsAI" ? aiDifficulty : undefined });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" /> New Game
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Game Mode */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Game Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "solo" as GameMode, label: "Solo", icon: <Play className="w-4 h-4" />, desc: "Classic Klondike" },
                { id: "vsAI" as GameMode, label: "vs AI", icon: <Bot className="w-4 h-4" />, desc: "Race the bot" },
                { id: "vsPlayer" as GameMode, label: "Online", icon: <Users className="w-4 h-4" />, desc: "Race a friend" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "p-3 rounded-xl border text-center transition-all",
                    mode === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex justify-center mb-1">{m.icon}</div>
                  <div className="font-semibold text-sm">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty */}
          {mode === "vsAI" && (
            <div>
              <Label className="text-sm font-semibold mb-3 block">AI Difficulty</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "easy" as AIDifficulty, label: "Easy", icon: "🌱", desc: "Slow & random" },
                  { id: "medium" as AIDifficulty, label: "Medium", icon: "⚡", desc: "Greedy strategy" },
                  { id: "hard" as AIDifficulty, label: "Hard", icon: "🔥", desc: "Optimal play" },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setAiDifficulty(d.id)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all",
                      aiDifficulty === d.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <div className="text-xl mb-1">{d.icon}</div>
                    <div className="font-semibold text-sm">{d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Draw Mode */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Draw Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "draw1" as DrawMode, label: "Draw 1", desc: "Easier — draw one card at a time" },
                { id: "draw3" as DrawMode, label: "Draw 3", desc: "Harder — draw three at a time" },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDrawMode(d.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    drawMode === d.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="font-semibold text-sm">{d.label}</div>
                  <div className="text-xs text-muted-foreground">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <Label className="text-sm font-semibold mb-3 block flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Theme
            </Label>
            <div className="grid grid-cols-5 gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.name}
                  className={cn(
                    "p-2 rounded-xl border text-center transition-all",
                    theme === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <div className="text-xs font-medium leading-tight">{t.name.split(" ")[0]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Card Back */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Card Back</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {CARD_BACKS.map((cb) => (
                <button
                  key={cb.id}
                  onClick={() => setCardBack(cb.id)}
                  title={cb.name}
                  className={cn(
                    "p-2 rounded-xl border text-center transition-all",
                    cardBack === cb.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="text-2xl mb-1">{cb.emoji}</div>
                  <div className="text-xs font-medium">{cb.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleStart}
          >
            {mode === "vsPlayer" ? (
              <><Users className="w-4 h-4" /> Find Match</>
            ) : (
              <><Play className="w-4 h-4" /> Start Game</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const { session: guestSession, createGuestSession, isLoading: guestLoading } = useGuestSession();
  const [showNewGame, setShowNewGame] = useState(false);
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  const { data: stats } = trpc.user.getStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: leaderboard } = trpc.leaderboard.get.useQuery({ mode: "solo", limit: 5 });

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    if (config.mode === "vsPlayer") {
      navigate("/multiplayer");
    } else {
      navigate("/game");
    }
    // Store config in sessionStorage for the Game page to pick up
    sessionStorage.setItem("gameConfig", JSON.stringify(config));
  };

  const handleGuestPlay = async (name: string) => {
    try {
      await createGuestSession(name);
      setShowGuestSelector(false);
      // Show new game modal after creating guest session
      setTimeout(() => setShowNewGame(true), 300);
    } catch (e) {
      console.error("Failed to create guest session", e);
    }
  };

  return (
    <div className="game-table min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 game-hud">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-8 h-8" />
            <span className="font-serif font-bold text-xl text-foreground">Solitaire<span className="text-primary">+</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")}>
              <Trophy className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/elo")}>
              <Zap className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">ELO</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/daily")}>
              <Calendar className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Daily</span>
            </Button>
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">{user?.name?.split(" ")[0] ?? "Profile"}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
                  <Settings2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
                <LogIn className="w-4 h-4 mr-1.5" /> Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="container py-8 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" /> The Ultimate Solitaire Experience
          </div>
          <h1 className="text-5xl sm:text-7xl font-serif font-bold text-foreground mb-4 leading-tight">
            Solitaire<span className="text-primary">+</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Classic Klondike reimagined — with AI opponents, online multiplayer,
            5 themes, achievements, and an AI coach.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2 text-base px-8 h-12" onClick={() => setShowNewGame(true)}>
              <Play className="w-5 h-5" /> Play Now
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-6 h-12" onClick={() => navigate("/daily")}>
              <Calendar className="w-5 h-5" /> Daily Challenge
            </Button>
          </div>
        </div>

        {/* Quick Play Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            {
              icon: <Play className="w-6 h-6" />,
              title: "Solo Play",
              desc: "Classic Klondike with advanced scoring, hints, and AI coaching",
              badge: "Most Popular",
              badgeColor: "text-green-400 border-green-400/40",
              action: () => {
                sessionStorage.setItem("gameConfig", JSON.stringify({ mode: "solo", drawMode: "draw1", theme: "classic", cardBack: "default" }));
                navigate("/game");
              },
            },
            {
              icon: <Bot className="w-6 h-6" />,
              title: "vs AI",
              desc: "Race an AI opponent on the same deck — Easy, Medium, or Hard",
              badge: "Challenge",
              badgeColor: "text-orange-400 border-orange-400/40",
              action: () => setShowNewGame(true),
            },
            {
              icon: <Users className="w-6 h-6" />,
              title: "Online Multiplayer",
              desc: "Real-time race against another player on the same shuffled deck",
              badge: "Live",
              badgeColor: "text-blue-400 border-blue-400/40",
              action: () => navigate("/multiplayer"),
            },
          ].map((card, i) => (
            <button
              key={i}
              onClick={card.action}
              className="p-6 rounded-2xl border border-border bg-card/60 hover:bg-card hover:border-primary/40 transition-all text-left group animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  {card.icon}
                </div>
                <Badge variant="outline" className={cn("text-xs", card.badgeColor)}>{card.badge}</Badge>
              </div>
              <h3 className="font-semibold text-lg mb-1">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              <div className="flex items-center gap-1 mt-4 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Play <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        {/* Features + Leaderboard Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {/* Features */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" /> Features
              </h3>
              <div className="space-y-3">
                {[
                  { icon: "🎨", text: "5 Visual Themes (Classic, Neon, Space, Nature, Pixel)" },
                  { icon: "🏆", text: "Advanced scoring with time bonuses & combos" },
                  { icon: "🤖", text: "AI opponent (Easy / Medium / Hard)" },
                  { icon: "🌐", text: "Real-time online multiplayer race rooms" },
                  { icon: "📅", text: "Daily challenge — same deck for everyone" },
                  { icon: "🎖", text: "Achievements & badge system" },
                  { icon: "💡", text: "Smart hint system (3 per game)" },
                  { icon: "🧠", text: "AI Coach \"Ace\" for strategic advice" },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-base flex-shrink-0">{f.icon}</span>
                    <span className="text-muted-foreground">{f.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard preview */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" /> Top Players
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")}>
                  View All <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              {!leaderboard || leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No scores yet — be the first!
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <span className="text-muted-foreground font-mono text-sm w-5">#{i + 1}</span>
                      <span className="flex-1 font-medium text-sm truncate">{entry.name ?? "Anonymous"}</span>
                      <span className="font-bold font-mono text-primary text-sm">{entry.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User stats if logged in */}
        {isAuthenticated && stats && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Your Stats
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Best Score", value: stats.bestScore.toLocaleString() },
                  { label: "Win Rate", value: `${stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%` },
                  { label: "Games Played", value: stats.gamesPlayed },
                  { label: "Win Streak", value: stats.currentStreak },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold font-mono text-primary">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <NewGameModal
        open={showNewGame}
        onClose={() => setShowNewGame(false)}
        onStart={handleStartGame}
      />

      <Footer />
      <GuestNameSelector
        open={showGuestSelector}
        onSelect={handleGuestPlay}
        isLoading={guestLoading}
      />
    </div>
  );
}
