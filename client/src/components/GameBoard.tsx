import React, { useState, useCallback, useRef, useEffect } from "react";
import type { Card, CardBack, GameState } from "@shared/gameTypes";
import type { HintMove } from "../game/engine";
import { canAutoComplete } from "../game/engine";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

interface DragState {
  fromType: "tableau" | "waste" | "foundation";
  fromIndex: number;
  fromCardIndex: number;
  cards: Card[];
}

interface GameBoardProps {
  state: GameState;
  cardBack?: CardBack;
  hint?: HintMove | null;
  onDraw: () => void;
  onMoveWasteToTableau: (toCol: number) => void;
  onMoveWasteToFoundation: (foundIdx: number) => void;
  onMoveTableauToFoundation: (fromCol: number, foundIdx: number) => void;
  onMoveTableauToTableau: (fromCol: number, fromCardIdx: number, toCol: number) => void;
  onMoveFoundationToTableau: (foundIdx: number, toCol: number) => void;
  onAutoComplete?: () => void;
}

const SUIT_ORDER = ["spades", "hearts", "diamonds", "clubs"];

function FoundationPile({
  cards,
  index,
  cardBack,
  isHinted,
  onDrop,
  onCardClick,
}: {
  cards: Card[];
  index: number;
  cardBack?: CardBack;
  isHinted?: boolean;
  onDrop: (foundIdx: number) => void;
  onCardClick: (foundIdx: number) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const suitSymbols = ["♠", "♥", "♦", "♣"];
  const top = cards[cards.length - 1];

  return (
    <div
      className={cn("relative", "pile-empty", isDragOver && "drop-target", "transition-all duration-200 hover:shadow-lg")}
      style={{ width: "100%", aspectRatio: "2.5/3.5" }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(index); }}
      onClick={() => onCardClick(index)}
    >
      {!top && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-30 select-none">
          {suitSymbols[index]}
        </div>
      )}
      {top && (
        <div className="absolute inset-0" onClick={() => onCardClick(index)}>
          <PlayingCard
            card={top}
            cardBack={cardBack}
            isHinted={isHinted}
            className="w-full h-full cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}

function StockPile({ cards, waste, cardBack, drawMode, onDraw }: {
  cards: Card[];
  waste: Card[];
  cardBack?: CardBack;
  drawMode: "draw1" | "draw3";
  onDraw: () => void;
}) {
  const top = waste[waste.length - 1];
  const canRecycle = cards.length === 0 && waste.length > 0;

  return (
    <div style={{ width: "100%", aspectRatio: "2.5/3.5", position: "relative" }}>
      {/* Stock */}
      <div
        className={cn("pile-empty absolute inset-0 cursor-pointer")}
        style={{ width: "100%", height: "100%" }}
        onClick={onDraw}
      >
        {cards.length > 0 ? (
          <PlayingCard
            card={{ id: "stock", suit: "spades", rank: 1, faceUp: false }}
            cardBack={cardBack}
            className="w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xl opacity-40 select-none">
            {canRecycle ? "↺" : "∅"}
          </div>
        )}
        <div className="absolute bottom-1 right-1 text-xs opacity-50 text-foreground font-mono">
          {cards.length}
        </div>
      </div>
    </div>
  );
}

function WastePile({ waste, cardBack, isHinted, onCardClick, onDragStart }: {
  waste: Card[];
  cardBack?: CardBack;
  isHinted?: boolean;
  onCardClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const top = waste[waste.length - 1];
  const second = waste[waste.length - 2];
  const third = waste[waste.length - 3];

  return (
    <div style={{ width: "100%", aspectRatio: "2.5/3.5", position: "relative" }}>
      <div className="pile-empty absolute inset-0" />
      {third && (
        <div className="absolute inset-0" style={{ transform: "translateX(-14px)", zIndex: 1 }}>
          <PlayingCard card={third} cardBack={cardBack} className="w-full h-full" />
        </div>
      )}
      {second && (
        <div className="absolute inset-0" style={{ transform: "translateX(-7px)", zIndex: 2 }}>
          <PlayingCard card={second} cardBack={cardBack} className="w-full h-full" />
        </div>
      )}
      {top && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 3 }}
          draggable
          onDragStart={onDragStart}
          onClick={onCardClick}
        >
          <PlayingCard
            card={top}
            cardBack={cardBack}
            isHinted={isHinted}
            draggable
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

function TableauPile({
  cards,
  colIndex,
  cardBack,
  hintedCardId,
  onDrop,
  onCardDragStart,
  onCardClick,
}: {
  cards: Card[];
  colIndex: number;
  cardBack?: CardBack;
  hintedCardId?: string;
  onDrop: (toCol: number, e: React.DragEvent) => void;
  onCardDragStart: (fromCol: number, fromCardIdx: number, cards: Card[], e: React.DragEvent) => void;
  onCardClick: (fromCol: number, fromCardIdx: number) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const CARD_HEIGHT_PERCENT = 28; // % of card height visible when stacked
  const FACE_DOWN_PERCENT = 18;

  return (
    <div
      className={cn("relative", isDragOver && "drop-target rounded-lg")}
      style={{ minHeight: "clamp(120px, 20vw, 200px)" }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(colIndex, e); }}
    >
      {/* Empty pile indicator */}
      {cards.length === 0 && (
        <div
          className="pile-empty absolute inset-x-0 top-0"
          style={{ aspectRatio: "2.5/3.5" }}
        />
      )}

      {/* Cards */}
      {cards.map((card, idx) => {
        const isLast = idx === cards.length - 1;
        const isFaceUp = card.faceUp;
        const offsetPercent = cards.slice(0, idx).reduce((acc, c) => {
          return acc + (c.faceUp ? CARD_HEIGHT_PERCENT : FACE_DOWN_PERCENT);
        }, 0);

        return (
          <div
            key={card.id}
            className="absolute inset-x-0"
            style={{
              top: `${offsetPercent}%`,
              zIndex: idx + 1,
            }}
          >
            <div
              style={{ width: "100%", aspectRatio: "2.5/3.5" }}
              draggable={isFaceUp}
              onDragStart={(e) => {
                if (isFaceUp) onCardDragStart(colIndex, idx, cards.slice(idx), e);
              }}
              onClick={() => onCardClick(colIndex, idx)}
            >
              <PlayingCard
                card={card}
                cardBack={cardBack}
                isHinted={card.id === hintedCardId}
                draggable={isFaceUp}
                className="w-full h-full"
              />
            </div>
          </div>
        );
      })}

      {/* Extra height for stacked cards */}
      {cards.length > 0 && (
        <div style={{
          height: `${cards.reduce((acc, c) => acc + (c.faceUp ? CARD_HEIGHT_PERCENT : FACE_DOWN_PERCENT), 0) + 100}%`,
          minHeight: "clamp(120px, 20vw, 200px)",
        }} />
      )}
    </div>
  );
}

export function GameBoard({
  state,
  cardBack = "default",
  hint,
  onDraw,
  onMoveWasteToTableau,
  onMoveWasteToFoundation,
  onMoveTableauToFoundation,
  onMoveTableauToTableau,
  onMoveFoundationToTableau,
  onAutoComplete,
}: GameBoardProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback((
    fromType: "tableau" | "waste" | "foundation",
    fromIndex: number,
    fromCardIndex: number,
    cards: Card[],
    e: React.DragEvent
  ) => {
    e.dataTransfer.effectAllowed = "move";
    setDragState({ fromType, fromIndex, fromCardIndex, cards });
  }, []);

  // Handle foundation card clicks (try to move back to tableau)
  const handleFoundationCardClick = useCallback((foundIdx: number) => {
    const foundPile = state.foundation[foundIdx]!;
    if (foundPile.length === 0) return;
    const card = foundPile[foundPile.length - 1]!;
    
    // Try to move to tableau
    for (let toCol = 0; toCol < 7; toCol++) {
      const targetPile = state.tableau[toCol]!;
      const targetTop = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;
      
      // Check if move is valid
      const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
      const targetIsRed = targetTop ? (targetTop.suit === 'hearts' || targetTop.suit === 'diamonds') : false;
      
      if (!targetTop && card.rank === 13) {
        // King on empty
        onMoveFoundationToTableau(foundIdx, toCol);
        return;
      }
      if (targetTop && targetTop.faceUp && isRed !== targetIsRed && card.rank === targetTop.rank - 1) {
        // Valid tableau move
        onMoveFoundationToTableau(foundIdx, toCol);
        return;
      }
    }
  }, [state, onMoveFoundationToTableau]);
  
  const handleFoundationDrop = useCallback((foundIdx: number) => {
    if (!dragState) return;
    if (dragState.fromType === "waste") {
      onMoveWasteToFoundation(foundIdx);
    } else if (dragState.fromType === "tableau") {
      onMoveTableauToFoundation(dragState.fromIndex, foundIdx);
    }
    setDragState(null);
  }, [dragState, onMoveWasteToFoundation, onMoveTableauToFoundation]);

  const handleTableauDrop = useCallback((toCol: number, e: React.DragEvent) => {
    if (!dragState) return;
    if (dragState.fromType === "waste") {
      onMoveWasteToTableau(toCol);
    } else if (dragState.fromType === "tableau") {
      onMoveTableauToTableau(dragState.fromIndex, dragState.fromCardIndex, toCol);
    } else if (dragState.fromType === "foundation") {
      onMoveFoundationToTableau(dragState.fromIndex, toCol);
    }
    setDragState(null);
  }, [dragState, onMoveWasteToTableau, onMoveTableauToTableau, onMoveFoundationToTableau]);

  // Smart click: auto-move to foundation first, then try tableau
  const handleTableauCardClick = useCallback((fromCol: number, fromCardIdx: number) => {
    const pile = state.tableau[fromCol]!;
    if (fromCardIdx !== pile.length - 1) return; // only top card
    const card = pile[fromCardIdx]!;
    if (!card.faceUp) return;
    
    // Priority 1: Try to move to foundation
    for (let fi = 0; fi < 4; fi++) {
      const foundPile = state.foundation[fi]!;
      if (foundPile.length === 0 && card.rank === 1) {
        onMoveTableauToFoundation(fromCol, fi);
        return;
      }
      const top = foundPile[foundPile.length - 1];
      if (top && top.suit === card.suit && card.rank === top.rank + 1) {
        onMoveTableauToFoundation(fromCol, fi);
        return;
      }
    }
    
    // Priority 2: Try to move to tableau (find best destination)
    for (let toCol = 0; toCol < 7; toCol++) {
      if (toCol === fromCol) continue;
      const targetPile = state.tableau[toCol]!;
      const targetTop = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;
      
      // Check if move is valid
      const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
      const targetIsRed = targetTop ? (targetTop.suit === 'hearts' || targetTop.suit === 'diamonds') : false;
      
      if (!targetTop && card.rank === 13) {
        // King on empty
        onMoveTableauToTableau(fromCol, fromCardIdx, toCol);
        return;
      }
      if (targetTop && targetTop.faceUp && isRed !== targetIsRed && card.rank === targetTop.rank - 1) {
        // Valid tableau move
        onMoveTableauToTableau(fromCol, fromCardIdx, toCol);
        return;
      }
    }
  }, [state, onMoveTableauToFoundation, onMoveTableauToTableau]);

  // Smart click: auto-move waste to foundation first, then try tableau
  const handleWasteCardClick = useCallback(() => {
    const card = state.waste[state.waste.length - 1];
    if (!card) return;
    
    // Priority 1: Try to move to foundation
    for (let fi = 0; fi < 4; fi++) {
      const foundPile = state.foundation[fi]!;
      if (foundPile.length === 0 && card.rank === 1) {
        onMoveWasteToFoundation(fi);
        return;
      }
      const top = foundPile[foundPile.length - 1];
      if (top && top.suit === card.suit && card.rank === top.rank + 1) {
        onMoveWasteToFoundation(fi);
        return;
      }
    }
    
    // Priority 2: Try to move to tableau (find best destination)
    for (let toCol = 0; toCol < 7; toCol++) {
      const targetPile = state.tableau[toCol]!;
      const targetTop = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;
      
      // Check if move is valid
      const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
      const targetIsRed = targetTop ? (targetTop.suit === 'hearts' || targetTop.suit === 'diamonds') : false;
      
      if (!targetTop && card.rank === 13) {
        // King on empty
        onMoveWasteToTableau(toCol);
        return;
      }
      if (targetTop && targetTop.faceUp && isRed !== targetIsRed && card.rank === targetTop.rank - 1) {
        // Valid tableau move
        onMoveWasteToTableau(toCol);
        return;
      }
    }
  }, [state, onMoveWasteToFoundation, onMoveWasteToTableau]);

  const hintedCardId = hint
    ? hint.fromType === "waste"
      ? state.waste[state.waste.length - 1]?.id
      : hint.fromType === "tableau"
      ? state.tableau[hint.fromIndex]?.[hint.fromCardIndex ?? state.tableau[hint.fromIndex]!.length - 1]?.id
      : state.foundation[hint.fromIndex]?.[state.foundation[hint.fromIndex]!.length - 1]?.id
    : undefined;

  const autoComplete = canAutoComplete(state);

  return (
    <div className="w-full px-2 py-3">
      {/* Top row: Stock, Waste, gap, Foundations */}
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {/* Stock */}
        <div>
          <StockPile
            cards={state.stock}
            waste={state.waste}
            cardBack={cardBack}
            drawMode={state.drawMode}
            onDraw={onDraw}
          />
        </div>

        {/* Waste */}
        <div>
          <WastePile
            waste={state.waste}
            cardBack={cardBack}
            isHinted={hint?.fromType === "waste"}
            onCardClick={handleWasteCardClick}
            onDragStart={(e) => {
              const top = state.waste[state.waste.length - 1];
              if (top) handleDragStart("waste", 0, 0, [top], e);
            }}
          />
        </div>

        {/* Spacer */}
        <div />

        {/* Auto-complete button (when available) */}
        {autoComplete && onAutoComplete && (
          <div className="col-span-1 flex items-center justify-center">
            <button
              onClick={onAutoComplete}
              className="text-xs px-2 py-1 rounded-full font-semibold animate-pulse"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              Auto ✓
            </button>
          </div>
        )}

        {/* Foundations */}
        {state.foundation.map((pile, fi) => (
          <div key={fi}>
            <FoundationPile
              cards={pile}
              index={fi}
              cardBack={cardBack}
              isHinted={hint?.toType === "foundation" && hint.toIndex === fi}
              onDrop={handleFoundationDrop}
              onCardClick={handleFoundationCardClick}
            />
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {state.tableau.map((pile, ci) => (
          <TableauPile
            key={ci}
            cards={pile}
            colIndex={ci}
            cardBack={cardBack}
            hintedCardId={hintedCardId}
            onDrop={handleTableauDrop}
            onCardDragStart={(fromCol, fromCardIdx, cards, e) =>
              handleDragStart("tableau", fromCol, fromCardIdx, cards, e)
            }
            onCardClick={handleTableauCardClick}
          />
        ))}
      </div>
    </div>
  );
}

export default GameBoard;
