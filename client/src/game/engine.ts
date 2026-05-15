import type { Card, GameState, DrawMode, Rank, Suit, ScoreBreakdown } from "@shared/gameTypes";

// ---------------------------------------------------------------------------
// HintMove type
// ---------------------------------------------------------------------------

export interface HintMove {
  fromType: "tableau" | "waste" | "foundation";
  fromIndex: number;
  toType: "tableau" | "foundation";
  toIndex: number;
  /** Index within the tableau pile (only relevant when fromType === "tableau") */
  fromCardIndex?: number;
}

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function seedFromString(seed: string): number {
  let h = 0x9dc5_811c;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x9e37_79b9);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

function makePrng(seed: string): () => number {
  let s = seedFromString(seed);
  return function () {
    s |= 0;
    s = (s + 0x6d2b_79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Deck helpers
// ---------------------------------------------------------------------------

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
    }
  }
  return deck;
}

function isRed(card: Card): boolean {
  return card.suit === "hearts" || card.suit === "diamonds";
}

// ---------------------------------------------------------------------------
// dealGame
// ---------------------------------------------------------------------------

export function dealGame(seed: string, drawMode: DrawMode): GameState {
  const rng = makePrng(seed);
  const deck = shuffleArray(buildDeck(), rng);

  // Deal tableau: pile i gets i+1 cards, last card face-up
  const tableau: Card[][] = [];
  let idx = 0;
  for (let i = 0; i < 7; i++) {
    const pile: Card[] = [];
    for (let j = 0; j <= i; j++) {
      const card = { ...deck[idx++]!, faceUp: j === i };
      pile.push(card);
    }
    tableau.push(pile);
  }

  // Remaining cards go to stock (face-down)
  const stock: Card[] = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));

  return {
    tableau,
    foundation: [[], [], [], []],
    stock,
    waste: [],
    score: 0,
    moves: 0,
    hintsUsed: 0,
    drawMode,
    startTime: Date.now(),
    isComplete: false,
  };
}

// ---------------------------------------------------------------------------
// applyDraw
// ---------------------------------------------------------------------------

export function applyDraw(state: GameState): GameState {
  // If stock is empty, recycle waste back to stock
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return state; // nothing to do
    return {
      ...state,
      stock: state.waste.slice().reverse().map((c) => ({ ...c, faceUp: false })),
      waste: [],
      moves: state.moves + 1,
    };
  }

  const drawCount = state.drawMode === "draw3" ? 3 : 1;
  const toDraw = state.stock.slice(-drawCount).reverse(); // top of stock first
  const newStock = state.stock.slice(0, state.stock.length - drawCount);
  const newWaste = [
    ...state.waste,
    ...toDraw.map((c) => ({ ...c, faceUp: true })),
  ];

  return {
    ...state,
    stock: newStock,
    waste: newWaste,
    moves: state.moves + 1,
  };
}

// ---------------------------------------------------------------------------
// Foundation validity
// ---------------------------------------------------------------------------

function canPlaceOnFoundation(card: Card, foundPile: Card[]): boolean {
  if (foundPile.length === 0) return card.rank === 1;
  const top = foundPile[foundPile.length - 1]!;
  return top.suit === card.suit && card.rank === top.rank + 1;
}

// ---------------------------------------------------------------------------
// Tableau validity
// ---------------------------------------------------------------------------

function canPlaceOnTableau(card: Card, targetPile: Card[]): boolean {
  if (targetPile.length === 0) return card.rank === 13; // King on empty
  const top = targetPile[targetPile.length - 1]!;
  if (!top.faceUp) return false;
  return isRed(card) !== isRed(top) && card.rank === top.rank - 1;
}

// ---------------------------------------------------------------------------
// Flip top card of a tableau pile if face-down
// ---------------------------------------------------------------------------

function flipTop(pile: Card[]): Card[] {
  if (pile.length === 0) return pile;
  const top = pile[pile.length - 1]!;
  if (top.faceUp) return pile;
  return [...pile.slice(0, -1), { ...top, faceUp: true }];
}

// ---------------------------------------------------------------------------
// applyMoveWasteToTableau
// ---------------------------------------------------------------------------

export function applyMoveWasteToTableau(
  state: GameState,
  toCol: number
): GameState | null {
  if (state.waste.length === 0) return null;
  const card = state.waste[state.waste.length - 1]!;
  const targetPile = state.tableau[toCol]!;

  if (!canPlaceOnTableau(card, targetPile)) return null;

  const newWaste = state.waste.slice(0, -1);
  const newTableau = state.tableau.map((pile, i) =>
    i === toCol ? [...pile, { ...card, faceUp: true }] : pile
  );

  return {
    ...state,
    waste: newWaste,
    tableau: newTableau,
    score: state.score + 5,
    moves: state.moves + 1,
  };
}

// ---------------------------------------------------------------------------
// applyMoveWasteToFoundation
// ---------------------------------------------------------------------------

export function applyMoveWasteToFoundation(
  state: GameState,
  foundIdx: number
): GameState | null {
  if (state.waste.length === 0) return null;
  const card = state.waste[state.waste.length - 1]!;
  const foundPile = state.foundation[foundIdx]!;

  if (!canPlaceOnFoundation(card, foundPile)) return null;

  const newWaste = state.waste.slice(0, -1);
  const newFoundation = state.foundation.map((pile, i) =>
    i === foundIdx ? [...pile, { ...card, faceUp: true }] : pile
  );

  const totalInFoundation =
    newFoundation.reduce((s, p) => s + p.length, 0);
  const isComplete = totalInFoundation === 52;

  return {
    ...state,
    waste: newWaste,
    foundation: newFoundation,
    score: state.score + 10,
    moves: state.moves + 1,
    isComplete,
  };
}

// ---------------------------------------------------------------------------
// applyMoveTableauToFoundation
// ---------------------------------------------------------------------------

export function applyMoveTableauToFoundation(
  state: GameState,
  fromCol: number,
  foundIdx: number
): GameState | null {
  const fromPile = state.tableau[fromCol]!;
  if (fromPile.length === 0) return null;
  const card = fromPile[fromPile.length - 1]!;
  if (!card.faceUp) return null;

  const foundPile = state.foundation[foundIdx]!;
  if (!canPlaceOnFoundation(card, foundPile)) return null;

  const newFromPile = flipTop(fromPile.slice(0, -1));
  const newTableau = state.tableau.map((pile, i) =>
    i === fromCol ? newFromPile : pile
  );
  const newFoundation = state.foundation.map((pile, i) =>
    i === foundIdx ? [...pile, { ...card, faceUp: true }] : pile
  );

  const totalInFoundation = newFoundation.reduce((s, p) => s + p.length, 0);
  const isComplete = totalInFoundation === 52;

  return {
    ...state,
    tableau: newTableau,
    foundation: newFoundation,
    score: state.score + 5,
    moves: state.moves + 1,
    isComplete,
  };
}

// ---------------------------------------------------------------------------
// applyMoveTableauToTableau
// ---------------------------------------------------------------------------

export function applyMoveTableauToTableau(
  state: GameState,
  fromCol: number,
  fromCardIdx: number,
  toCol: number
): GameState | null {
  if (fromCol === toCol) return null;
  const fromPile = state.tableau[fromCol]!;
  if (fromCardIdx < 0 || fromCardIdx >= fromPile.length) return null;

  const movingCards = fromPile.slice(fromCardIdx);
  if (movingCards.length === 0) return null;
  if (!movingCards[0]!.faceUp) return null;

  const targetPile = state.tableau[toCol]!;
  if (!canPlaceOnTableau(movingCards[0]!, targetPile)) return null;

  const newFromPile = flipTop(fromPile.slice(0, fromCardIdx));
  const newToPile = [...targetPile, ...movingCards];

  const newTableau = state.tableau.map((pile, i) => {
    if (i === fromCol) return newFromPile;
    if (i === toCol) return newToPile;
    return pile;
  });

  return {
    ...state,
    tableau: newTableau,
    moves: state.moves + 1,
  };
}

// ---------------------------------------------------------------------------
// applyMoveFoundationToTableau
// ---------------------------------------------------------------------------

export function applyMoveFoundationToTableau(
  state: GameState,
  foundIdx: number,
  toCol: number
): GameState | null {
  const foundPile = state.foundation[foundIdx]!;
  if (foundPile.length === 0) return null;
  const card = foundPile[foundPile.length - 1]!;

  const targetPile = state.tableau[toCol]!;
  if (!canPlaceOnTableau(card, targetPile)) return null;

  const newFoundation = state.foundation.map((pile, i) =>
    i === foundIdx ? pile.slice(0, -1) : pile
  );
  const newTableau = state.tableau.map((pile, i) =>
    i === toCol ? [...pile, { ...card, faceUp: true }] : pile
  );

  return {
    ...state,
    foundation: newFoundation,
    tableau: newTableau,
    score: Math.max(0, state.score - 15),
    moves: state.moves + 1,
  };
}

// ---------------------------------------------------------------------------
// isGameWon
// ---------------------------------------------------------------------------

export function isGameWon(state: GameState): boolean {
  if (state.isComplete) return true;
  return state.foundation.reduce((s, p) => s + p.length, 0) === 52;
}

// ---------------------------------------------------------------------------
// canAutoComplete
// ---------------------------------------------------------------------------

export function canAutoComplete(state: GameState): boolean {
  // Auto-complete is possible when stock and waste are empty and all
  // tableau cards are face-up (no hidden cards remain).
  if (state.stock.length > 0 || state.waste.length > 0) return false;
  for (const pile of state.tableau) {
    for (const card of pile) {
      if (!card.faceUp) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// autoCompleteStep
// ---------------------------------------------------------------------------

export function autoCompleteStep(state: GameState): GameState | null {
  if (isGameWon(state)) return null;

  // Try to move any tableau top card to foundation
  for (let col = 0; col < 7; col++) {
    for (let fi = 0; fi < 4; fi++) {
      const next = applyMoveTableauToFoundation(state, col, fi);
      if (next) return next;
    }
  }

  // Try waste to foundation (shouldn't happen in auto-complete but be safe)
  for (let fi = 0; fi < 4; fi++) {
    const next = applyMoveWasteToFoundation(state, fi);
    if (next) return next;
  }

  return null;
}

// ---------------------------------------------------------------------------
// findHints
// ---------------------------------------------------------------------------

export function findHints(state: GameState): HintMove[] {
  const hints: HintMove[] = [];

  // Priority 1: Move to foundation (waste or tableau top)
  // Waste → foundation
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1]!;
    for (let fi = 0; fi < 4; fi++) {
      if (canPlaceOnFoundation(card, state.foundation[fi]!)) {
        hints.push({ fromType: "waste", fromIndex: 0, toType: "foundation", toIndex: fi });
        break;
      }
    }
  }

  // Tableau → foundation
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col]!;
    if (pile.length === 0) continue;
    const card = pile[pile.length - 1]!;
    if (!card.faceUp) continue;
    for (let fi = 0; fi < 4; fi++) {
      if (canPlaceOnFoundation(card, state.foundation[fi]!)) {
        hints.push({
          fromType: "tableau",
          fromIndex: col,
          toType: "foundation",
          toIndex: fi,
          fromCardIndex: pile.length - 1,
        });
        break;
      }
    }
  }

  // Priority 2: Expose face-down cards (move face-up run to reveal hidden card)
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const fromPile = state.tableau[fromCol]!;
    const firstFaceUp = fromPile.findIndex((c) => c.faceUp);
    if (firstFaceUp <= 0) continue; // no face-down cards below, or pile empty
    for (let toCol = 0; toCol < 7; toCol++) {
      if (fromCol === toCol) continue;
      if (canPlaceOnTableau(fromPile[firstFaceUp]!, state.tableau[toCol]!)) {
        hints.push({
          fromType: "tableau",
          fromIndex: fromCol,
          toType: "tableau",
          toIndex: toCol,
          fromCardIndex: firstFaceUp,
        });
        break;
      }
    }
  }

  // Priority 3: Waste → tableau
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1]!;
    for (let toCol = 0; toCol < 7; toCol++) {
      if (canPlaceOnTableau(card, state.tableau[toCol]!)) {
        hints.push({ fromType: "waste", fromIndex: 0, toType: "tableau", toIndex: toCol });
        break;
      }
    }
  }

  // Priority 4: Tableau → tableau (strategic moves, prefer moving to non-empty piles)
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const fromPile = state.tableau[fromCol]!;
    const firstFaceUp = fromPile.findIndex((c) => c.faceUp);
    if (firstFaceUp < 0) continue;
    for (let ci = firstFaceUp; ci < fromPile.length; ci++) {
      const card = fromPile[ci]!;
      for (let toCol = 0; toCol < 7; toCol++) {
        if (fromCol === toCol) continue;
        const targetPile = state.tableau[toCol]!;
        if (targetPile.length === 0 && card.rank === 13 && firstFaceUp === 0) {
          // Moving a king to an empty pile is only useful if it exposes a face-down card
          // Skip if the king is already at the base of a pile with no hidden cards
          continue;
        }
        if (canPlaceOnTableau(card, targetPile)) {
          // Avoid duplicate hints
          const alreadyHinted = hints.some(
            (h) =>
              h.fromType === "tableau" &&
              h.fromIndex === fromCol &&
              h.toType === "tableau" &&
              h.toIndex === toCol
          );
          if (!alreadyHinted) {
            hints.push({
              fromType: "tableau",
              fromIndex: fromCol,
              toType: "tableau",
              toIndex: toCol,
              fromCardIndex: ci,
            });
          }
          break;
        }
      }
    }
  }

  return hints;
}

// ---------------------------------------------------------------------------
// calculateFinalScore
// ---------------------------------------------------------------------------

export function calculateFinalScore(
  score: number,
  elapsed: number,
  moves: number,
  hintsUsed: number,
  won: boolean
): ScoreBreakdown {
  const baseScore = score;
  const hintPenalty = hintsUsed * 20;

  // Time bonus: up to 500 points for finishing under 5 minutes
  const timeBonus = won ? Math.max(0, Math.floor((300 - elapsed) * (500 / 300))) : 0;

  // Move bonus: reward efficiency (fewer moves = higher bonus, cap at 200)
  const streakBonus = won ? Math.max(0, Math.floor(200 - moves * 0.5)) : 0;

  // Combo bonus: flat bonus for winning
  const comboBonus = won ? 100 : 0;

  const total = Math.max(0, baseScore + timeBonus + streakBonus + comboBonus - hintPenalty);

  return {
    baseScore,
    timeBonus,
    streakBonus,
    comboBonus,
    hintPenalty,
    total,
    moves,
    durationSecs: elapsed,
  };
}

// ---------------------------------------------------------------------------
// serializeBoardForLLM
// ---------------------------------------------------------------------------

const RANK_NAMES: Record<number, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
};

const SUIT_SYMBOLS: Record<string, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

function cardStr(card: Card): string {
  if (!card.faceUp) return "??";
  return `${RANK_NAMES[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

export function serializeBoardForLLM(state: GameState): string {
  const lines: string[] = [];

  // Foundation
  const foundStr = state.foundation
    .map((pile, i) => {
      const top = pile[pile.length - 1];
      return top ? cardStr(top) : `[${SUIT_SYMBOLS[SUITS[i]!]}]`;
    })
    .join("  ");
  lines.push(`Foundation: ${foundStr}`);

  // Stock / Waste
  const wasteTop = state.waste[state.waste.length - 1];
  lines.push(
    `Stock: ${state.stock.length} cards  |  Waste top: ${wasteTop ? cardStr(wasteTop) : "empty"}`
  );

  // Tableau
  lines.push("Tableau:");
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col]!;
    const pileStr =
      pile.length === 0
        ? "(empty)"
        : pile.map((c) => cardStr(c)).join(" ");
    lines.push(`  Col ${col + 1}: ${pileStr}`);
  }

  lines.push(`Score: ${state.score}  Moves: ${state.moves}  Hints used: ${state.hintsUsed}`);

  return lines.join("\n");
}
