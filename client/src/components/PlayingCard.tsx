import React, { useRef } from "react";
import type { Card, CardBack } from "@shared/gameTypes";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  card: Card;
  cardBack?: CardBack;
  isHinted?: boolean;
  isDragging?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent | React.TouchEvent) => void;
  onDragEnd?: () => void;
  draggable?: boolean;
  stackIndex?: number; // position in stack for offset
}

const RANK_LABELS: Record<number, string> = {
  1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
  8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
};

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠",
};

const SUIT_UNICODE: Record<string, string> = {
  hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠",
};

function isRed(suit: string) {
  return suit === "hearts" || suit === "diamonds";
}

function CardBack({ cardBack = "default" }: { cardBack?: CardBack }) {
  const patterns: Record<CardBack, React.ReactNode> = {
    default: (
      <div className="w-full h-full rounded-[6px] overflow-hidden" style={{ background: "linear-gradient(135deg, var(--card-back-primary), var(--card-back-secondary))" }}>
        <div className="w-full h-full flex items-center justify-center opacity-30">
          <div className="grid grid-cols-4 gap-1 p-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/60" />
            ))}
          </div>
        </div>
        <div className="absolute inset-2 border border-white/20 rounded-[4px]" />
      </div>
    ),
    waves: (
      <div className="w-full h-full rounded-[6px] overflow-hidden" style={{ background: "linear-gradient(135deg, var(--card-back-primary), var(--card-back-secondary))" }}>
        <svg className="w-full h-full opacity-30" viewBox="0 0 60 90">
          {[10, 20, 30, 40, 50, 60, 70, 80].map((y, i) => (
            <path key={i} d={`M0,${y} Q15,${y - 8} 30,${y} Q45,${y + 8} 60,${y}`} fill="none" stroke="white" strokeWidth="1.5" />
          ))}
        </svg>
      </div>
    ),
    diamonds: (
      <div className="w-full h-full rounded-[6px] overflow-hidden" style={{ background: "linear-gradient(135deg, var(--card-back-primary), var(--card-back-secondary))" }}>
        <svg className="w-full h-full opacity-25" viewBox="0 0 60 90">
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <polygon
                key={`${row}-${col}`}
                points={`${col * 15 + 7.5},${row * 18 + 2} ${col * 15 + 14},${row * 18 + 9} ${col * 15 + 7.5},${row * 18 + 16} ${col * 15 + 1},${row * 18 + 9}`}
                fill="none" stroke="white" strokeWidth="1"
              />
            ))
          )}
        </svg>
      </div>
    ),
    stars: (
      <div className="w-full h-full rounded-[6px] overflow-hidden" style={{ background: "linear-gradient(135deg, var(--card-back-primary), var(--card-back-secondary))" }}>
        <svg className="w-full h-full opacity-30" viewBox="0 0 60 90">
          {[[10, 15], [35, 10], [50, 30], [20, 45], [45, 55], [10, 65], [30, 75], [50, 80]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2" fill="white" />
          ))}
          {[[25, 25], [40, 40], [15, 50], [35, 65]].map(([cx, cy], i) => (
            <circle key={`lg-${i}`} cx={cx} cy={cy} r="3" fill="white" opacity="0.6" />
          ))}
        </svg>
      </div>
    ),
    pixels: (
      <div className="w-full h-full overflow-hidden" style={{ background: "linear-gradient(135deg, var(--card-back-primary), var(--card-back-secondary))", imageRendering: "pixelated" }}>
        <svg className="w-full h-full opacity-40" viewBox="0 0 12 18">
          {Array.from({ length: 12 }).map((_, row) =>
            Array.from({ length: 12 }).map((_, col) =>
              (row + col) % 2 === 0 ? (
                <rect key={`${row}-${col}`} x={col} y={row} width="1" height="1" fill="white" />
              ) : null
            )
          )}
        </svg>
      </div>
    ),
  };

  return <div className="absolute inset-0">{patterns[cardBack] ?? patterns.default}</div>;
}

export const PlayingCard = React.memo(function PlayingCard({
  card,
  cardBack = "default",
  isHinted = false,
  isDragging = false,
  style,
  className,
  onClick,
  onDragStart,
  onDragEnd,
  draggable = false,
}: PlayingCardProps) {
  const red = isRed(card.suit);
  const rankLabel = RANK_LABELS[card.rank] ?? String(card.rank);
  const suitSymbol = SUIT_SYMBOLS[card.suit] ?? "";

  if (!card.faceUp) {
    return (
      <div
        className={cn("card select-none", isDragging && "dragging", className)}
        style={{ width: "100%", height: "100%", ...style }}
        draggable={draggable}
        onDragStart={onDragStart as React.DragEventHandler}
        onDragEnd={onDragEnd}
        onClick={onClick}
      >
        <CardBack cardBack={cardBack} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "card select-none",
        isDragging && "dragging",
        isHinted && "hint-glow",
        className
      )}
      style={{
        width: "100%",
        height: "100%",
        background: "var(--card-face)",
        ...style,
      }}
      draggable={draggable}
      onDragStart={onDragStart as React.DragEventHandler}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {/* Top-left rank + suit */}
      <div
        className={cn("absolute top-1 left-1.5 flex flex-col items-center leading-none font-bold", red ? "suit-red" : "suit-black")}
        style={{ fontSize: "clamp(0.55rem, 1.5vw, 0.85rem)" }}
      >
        <span>{rankLabel}</span>
        <span style={{ fontSize: "0.9em" }}>{suitSymbol}</span>
      </div>

      {/* Center suit */}
      <div
        className={cn("absolute inset-0 flex items-center justify-center font-bold", red ? "suit-red" : "suit-black")}
        style={{ fontSize: "clamp(1rem, 3vw, 1.8rem)", opacity: 0.85 }}
      >
        {suitSymbol}
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div
        className={cn("absolute bottom-1 right-1.5 flex flex-col items-center leading-none font-bold rotate-180", red ? "suit-red" : "suit-black")}
        style={{ fontSize: "clamp(0.55rem, 1.5vw, 0.85rem)" }}
      >
        <span>{rankLabel}</span>
        <span style={{ fontSize: "0.9em" }}>{suitSymbol}</span>
      </div>
    </div>
  );
});

export default PlayingCard;
