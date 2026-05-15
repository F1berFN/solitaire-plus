import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, X, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachMessage {
  role: "coach" | "system";
  content: string;
  timestamp: number;
}

interface CoachPanelProps {
  getBoardState: () => string;
  moveCount: number;
  score: number;
  hintsUsed: number;
  mode: string;
  onClose: () => void;
}

const COACH_TIPS = [
  "Always prioritize moving cards to the foundation when possible.",
  "Expose face-down cards to unlock more moves.",
  "An empty tableau column is very valuable — use it wisely.",
  "In Draw 3 mode, plan ahead — you can only access every 3rd card.",
  "Kings are the only cards that can fill empty tableau columns.",
];

export function CoachPanel({
  getBoardState,
  moveCount,
  score,
  hintsUsed,
  mode,
  onClose,
}: CoachPanelProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: "system",
      content: "👋 Hi! I'm Ace, your Solitaire coach. Click **Analyze Board** for strategic advice, or ask me anything about your current game!",
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeBoard = trpc.coach.analyze.useMutation();

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    const boardState = getBoardState();
    try {
      const result = await analyzeBoard.mutateAsync({
        boardState,
        moveCount,
        score,
        hintsUsed,
        mode,
      });
      const advice = typeof result.advice === 'string' ? result.advice : 'Keep playing!';
      setMessages((prev) => [
        ...prev,
        {
          role: "coach" as const,
          content: advice,
          timestamp: Date.now(),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "coach" as const,
          content: "I'm having trouble analyzing the board right now. Here's a general tip: " +
            (COACH_TIPS[Math.floor(Math.random() * COACH_TIPS.length)] ?? ''),
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [getBoardState, moveCount, score, hintsUsed, mode, analyzeBoard]);

  return (
    <div className="h-full flex flex-col bg-card border-l border-border shadow-2xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">Ace</div>
            <div className="text-xs text-muted-foreground">AI Coach</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl p-3 text-sm leading-relaxed animate-fade-in",
                msg.role === "coach"
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted/40"
              )}
            >
              {msg.role === "coach" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">Ace's Advice</span>
                </div>
              )}
              <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {isLoading && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
              <div className="flex items-center gap-2 text-primary text-sm">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Analyzing your board...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Actions */}
      <div className="p-4 space-y-2">
        <Button
          className="w-full gap-2"
          onClick={handleAnalyze}
          disabled={isLoading}
        >
          <Sparkles className="w-4 h-4" />
          {isLoading ? "Analyzing..." : "Analyze Board"}
        </Button>
        <div className="text-xs text-muted-foreground text-center">
          Move {moveCount} · Score {score}
        </div>
      </div>
    </div>
  );
}
