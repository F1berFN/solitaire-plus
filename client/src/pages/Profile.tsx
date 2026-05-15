import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Flame, Clock, Target, Star, Lock, Gamepad2 } from "lucide-react";
import { ACHIEVEMENTS } from "@shared/achievements";
import { getEloTier, getEloTierColor } from "@shared/elo";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";

function StatCard({ label, value, icon, highlight = false }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "p-4 rounded-xl border",
      highlight ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("opacity-70", highlight && "text-primary")}>{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-2xl font-bold font-mono", highlight && "text-primary")}>{value}</div>
    </div>
  );
}

function AchievementBadge({ achievementKey, unlocked, unlockedAt }: {
  achievementKey: string;
  unlocked: boolean;
  unlockedAt?: Date;
}) {
  const def = ACHIEVEMENTS.find((a) => a.key === achievementKey);
  if (!def) return null;

  const rarityColors: Record<string, string> = {
    common: "border-slate-500/40 bg-slate-500/10",
    rare: "border-blue-500/40 bg-blue-500/10",
    epic: "border-purple-500/40 bg-purple-500/10",
    legendary: "border-yellow-500/40 bg-yellow-500/10",
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border text-center transition-all",
      unlocked ? rarityColors[def.rarity] : "border-border bg-muted/20 opacity-50 grayscale"
    )}>
      <div className="text-3xl mb-2">{unlocked ? def.icon : "🔒"}</div>
      <div className="font-semibold text-sm">{def.name}</div>
      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{def.description}</div>
      <Badge
        variant="outline"
        className={cn("mt-2 text-xs capitalize", !unlocked && "opacity-50")}
      >
        {def.rarity}
      </Badge>
      {unlocked && unlockedAt && (
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(unlockedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const { data: stats, isLoading: statsLoading } = trpc.user.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: achievements, isLoading: achievementsLoading } = trpc.achievements.getUserAchievements.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: history, isLoading: historyLoading } = trpc.game.getUserGames.useQuery({ limit: 20 }, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="game-table min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm animate-scale-in">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-serif font-bold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">Sign in to view your profile, stats, and achievements.</p>
          <Button className="w-full" onClick={() => window.location.href = getLoginUrl()}>
            Sign In
          </Button>
          <Button variant="ghost" className="w-full mt-2" onClick={() => navigate("/")}>
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  const unlockedKeys = new Set(achievements?.map((a) => a.achievementKey) ?? []);
  const elo = stats?.elo ?? 1200;
  const tier = getEloTier(elo);
  const winRate = stats && stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;
  const avgTime = stats && stats.gamesPlayed > 0
    ? Math.round(stats.totalTimeSecs / stats.gamesPlayed)
    : 0;

  return (
    <div className="game-table min-h-screen">
      <div className="container py-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-serif font-bold">{user?.name ?? "Player"}</h2>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {unlockedKeys.size} / {ACHIEVEMENTS.length} achievements
                  </Badge>
                  {stats && stats.currentStreak > 0 && (
                    <Badge variant="outline" className="text-xs text-orange-400 border-orange-400/40">
                      🔥 {stats.currentStreak} streak
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="stats">
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats">
            {statsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Best Score" value={(stats?.bestScore ?? 0).toLocaleString()} icon={<Trophy className="w-4 h-4" />} highlight />
            <StatCard label="ELO Rating" value={elo.toLocaleString()} icon={<Trophy className="w-5 h-5" />} highlight />
                <StatCard label="Win Rate" value={`${winRate}%`} icon={<Target className="w-4 h-4" />} />
                <StatCard label="Games Played" value={stats?.gamesPlayed ?? 0} icon={<Gamepad2 className="w-4 h-4" />} />
                <StatCard label="Games Won" value={stats?.gamesWon ?? 0} icon={<Star className="w-4 h-4" />} />
                <StatCard label="Best Streak" value={stats?.bestStreak ?? 0} icon={<Flame className="w-4 h-4" />} />
                <StatCard
                  label="Avg Time"
                  value={`${Math.floor(avgTime / 60)}:${(avgTime % 60).toString().padStart(2, "0")}`}
                  icon={<Clock className="w-4 h-4" />}
                />
              </div>
            )}
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            {achievementsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {unlockedKeys.size} of {ACHIEVEMENTS.length} unlocked
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ACHIEVEMENTS.map((achievement) => {
                    const userAch = achievements?.find((a) => a.achievementKey === achievement.key);
                    return (
                      <AchievementBadge
                        key={achievement.key}
                        achievementKey={achievement.key}
                        unlocked={unlockedKeys.has(achievement.key)}
                        unlockedAt={userAch?.unlockedAt}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            {historyLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No games played yet. Start playing!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history?.map((game: any) => (
                  <div key={game.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      game.won ? "bg-green-400" : "bg-red-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{game.mode}</span>
                        {game.aiDifficulty && (
                          <Badge variant="outline" className="text-xs capitalize">{game.aiDifficulty}</Badge>
                        )}
                        <Badge variant="outline" className={cn("text-xs", game.won ? "text-green-400 border-green-400/40" : "text-red-400 border-red-400/40")}>
                          {game.won ? "Won" : "Lost"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(game.createdAt).toLocaleDateString()} · {game.moves} moves ·{" "}
                        {Math.floor(game.durationSecs / 60)}:{(game.durationSecs % 60).toString().padStart(2, "0")}
                      </div>
                    </div>
                    <div className="font-bold font-mono text-primary">{game.score.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
