import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGuestSession } from "@/hooks/useGuestSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Zap, TrendingUp, Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEloTier, getEloTierColor, formatEloChange } from "@shared/elo";

export default function EloLeaderboardPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { session: guestSession } = useGuestSession();
  const { data, isLoading } = trpc.leaderboard.elo.useQuery({ limit: 100 });

  const currentPlayerId = user?.id ?? guestSession?.id;
  const currentPlayerName = user?.name?.split(" ")[0] ?? guestSession?.fullName ?? "You";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <Trophy className="w-16 h-16 text-muted-foreground mb-4 opacity-30" />
        <h2 className="text-2xl font-bold mb-2">No ELO Ratings Yet</h2>
        <p className="text-muted-foreground mb-6">Play some games to climb the ELO ladder!</p>
        <Button onClick={() => navigate("/")} className="gap-2">
          <Zap className="w-4 h-4" />
          Start Playing
        </Button>
      </div>
    );
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-muted-foreground font-mono text-sm w-5 text-center">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Zap className="w-8 h-8 text-yellow-500" />
                ELO Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground">Competitive rankings by rating</p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-2">
          {data.map((entry: any, i: number) => {
            const rank = i + 1;
            const isMe = currentPlayerId === entry.id;
            const tier = getEloTier(entry.elo);
            const tierColor = getEloTierColor(entry.elo);

            return (
              <Card
                key={`${entry.id}-${i}`}
                className={cn(
                  "transition-all",
                  rank <= 3 && "border-primary/50 bg-primary/5",
                  isMe && "ring-2 ring-primary/50 bg-primary/10"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank (already showing via rankIcon) */}
                    <div className="flex items-center justify-center w-8">
                      {rankIcon(rank)}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">{entry.name ?? "Anonymous"}</span>
                        {isMe && (
                          <Badge variant="outline" className="text-xs text-primary border-primary/40">
                            You
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {tier}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.gamesWon} wins
                      </div>
                    </div>

                    {/* ELO Rating */}
                    <div className="text-right">
                      <div className={cn(
                        "font-bold font-mono text-2xl bg-gradient-to-r",
                        tierColor,
                        "bg-clip-text text-transparent"
                      )}>
                        {entry.elo.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">rating</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-card rounded-lg border border-border text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" />
            ELO ratings are updated after each competitive game. Win to climb the ladder!
          </p>
        </div>
      </div>
    </div>
  );
}
