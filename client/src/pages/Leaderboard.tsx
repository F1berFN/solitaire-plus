import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGuestSession } from "@/hooks/useGuestSession";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Bot, Users, Calendar, Medal, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderboardMode = "solo" | "vsAI" | "vsPlayer";

function LeaderboardTable({ mode }: { mode: LeaderboardMode }) {
  const { data, isLoading } = trpc.leaderboard.get.useQuery({ mode, limit: 50 });
  const { user } = useAuth();
  const { session: guestSession } = useGuestSession();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No scores yet</p>
        <p className="text-sm mt-1">Be the first to claim the top spot!</p>
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
    <div className="space-y-2">
      {data.map((entry, i) => {
        const rank = i + 1;
        const isMe = user && entry.userId === user.id;
        return (
          <div
            key={`${entry.userId}-${i}`}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl transition-colors",
              rank <= 3 ? "bg-card border border-border" : "bg-muted/30",
              isMe && "ring-2 ring-primary/50 bg-primary/5"
            )}
          >
            <div className="flex items-center justify-center w-8">
              {rankIcon(rank)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate flex items-center gap-2">
                {entry.name ?? "Anonymous"}
                {isMe && <Badge variant="outline" className="text-xs text-primary border-primary/40">You</Badge>}
                {guestSession && entry.userId === guestSession.id && <Badge variant="outline" className="text-xs text-purple-400 border-purple-400/40">Guest</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{entry.gamesWon} wins</div>
            </div>
            <div className="text-right">
              <div className="font-bold font-mono text-lg text-primary">{entry.score.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DailyLeaderboard() {
  const { data, isLoading } = trpc.leaderboard.daily.useQuery({ date: undefined });
  const { user } = useAuth();

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>;
  }

  const { challenge, entries } = data ?? { challenge: null, entries: [] };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Today's Challenge</span>
        </div>
        <p className="text-muted-foreground text-sm">{today}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Draw {challenge?.drawMode === "draw3" ? "3" : "1"} mode · Same deck for everyone
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No entries yet today. Play the daily challenge!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isMe = user && entry.userId === user.id;
            return (
              <div
                key={`${entry.userId}-${i}`}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl",
                  rank <= 3 ? "bg-card border border-border" : "bg-muted/30",
                  isMe && "ring-2 ring-primary/50 bg-primary/5"
                )}
              >
                <div className="w-8 text-center font-mono text-sm text-muted-foreground">#{rank}</div>
                <div className="flex-1">
                  <div className="font-semibold">{entry.name ?? "Anonymous"}</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.floor(entry.durationSecs / 60)}:{(entry.durationSecs % 60).toString().padStart(2, "0")}
                  </div>
                </div>
                <div className="font-bold font-mono text-primary">{entry.score.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [, navigate] = useLocation();

  return (
    <div className="game-table min-h-screen">
      <div className="container py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400" /> Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Top scores across all game modes</p>
          </div>
        </div>

        <Tabs defaultValue="solo">
          <TabsList className="grid grid-cols-4 w-full mb-6">
            <TabsTrigger value="solo" className="gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Solo
            </TabsTrigger>
            <TabsTrigger value="vsAI" className="gap-1.5">
              <Bot className="w-3.5 h-3.5" /> vs AI
            </TabsTrigger>
            <TabsTrigger value="vsPlayer" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> vs Player
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Daily
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solo">
            <LeaderboardTable mode="solo" />
          </TabsContent>
          <TabsContent value="vsAI">
            <LeaderboardTable mode="vsAI" />
          </TabsContent>
          <TabsContent value="vsPlayer">
            <LeaderboardTable mode="vsPlayer" />
          </TabsContent>
          <TabsContent value="daily">
            <DailyLeaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
