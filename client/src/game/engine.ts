import type { Card, GameState, DrawMode, Rank, Suit, ScoreBreakdown } from "@shared/gameTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HintMove {
  fromType: "waste" | "tableau" | "foundation";
  fromIndex: number;
  toType: "foundation" | "tableau";
  toIndex: number;
  /** Index of the first card in the sequence to move (tableau only) */
  fromCardIndex?: number;
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32 — fast, deterministic, good distribution)
// ---------------------------------------------------------------------------

function seedFromString(seed: string): number {
  let h = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

function makePrng(seed: string): () => number {
  let s = seedFromString(seed);
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

// ---------------------------------------------------------------------------
// dealGame
// ---------------------------------------------------------------------------

export function dealGame(seed: string, drawMode: DrawMode): GameState {
  const rng = makePrng(seed);
  const deck = shuffle(buildDeck(), rng);

  // Deal tableau: column i gets i+1 cards (0-indexed: col 0 → 1 card, col 6 → 7 cards)
  const tableau: Card[][] = [];
  let cursor = 0;
  for (let col = 0; col < 7; col++) {
    const count = col + 1;
    const pile = deck.slice(cursor, cursor + count).map((c, idx) => ({
      ...c,
      faceUp: idx === count - 1, // only the top card is face-up
    }));
    tableau.push(pile);
    cursor += count;
  }

  // Remaining 24 cards go to stock (face-down)
  const stock = deck.slice(cursor).map((c) => ({ ...c, faceUp: false }));

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
// Move validation helpers
// ---------------------------------------------------------------------------

/** Can `card` be placed on top of a tableau pile whose current top is `target`?
 *  Empty pile accepts only Kings. */
function canPlaceOnTableau(card: Card, target: Card | null): boolean {
  if (!target) return card.rank === 13; // King on empty
  if (!target.faceUp) return false;
  return isRed(card.suit) !== isRed(target.suit) && card.rank === target.rank - 1;
}

/** Can `card` be placed on a foundation pile? */
function canPlaceOnFoundation(card: Card, foundPile: Card[]): boolean {
  if (foundPile.length === 0) return card.rank === 1; // Ace starts foundation
  const top = foundPile[foundPile.length - 1]!;
  return top.suit === card.suit && card.rank === top.rank + 1;
}

// ---------------------------------------------------------------------------
// Deep-copy helpers (keep state immutable)
// ---------------------------------------------------------------------------

function cloneCard(c: Card): Card {
  return { ...c };
}

function clonePile(pile: Card[]): Card[] {
  return pile.map(cloneCard);
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    tableau: state.tableau.map(clonePile),
    foundation: state.foundation.map(clonePile),
    stock: clonePile(state.stock),
    waste: clonePile(state.waste),
  };
}

// ---------------------------------------------------------------------------
// applyDraw
// ---------------------------------------------------------------------------

export function applyDraw(state: GameState): GameState {
  const next = cloneState(state);

  if (next.stock.length === 0) {
    // Recycle waste back to stock (face-down, reversed)
    if (next.waste.length === 0) return state; // nothing to do
    next.stock = next.waste.reverse().map((c) => ({ ...c, faceUp: false }));
    next.waste = [];
    next.score = Math.max(0, next.score - 100);
    next.moves += 1;
    return next;
  }

  const drawCount = state.drawMode === "draw3" ? 3 : 1;
  const toDraw = next.stock.splice(next.stock.length - drawCount, drawCount);
  // Cards come off the top of stock; the last one drawn is the new waste top
  for (const card of toDraw) {
    next.waste.push({ ...card, faceUp: true });
  }
  next.moves += 1;
  return next;
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

  const next = cloneState(state);
  next.waste.pop();
  next.foundation[foundIdx]!.push({ ...card, faceUp: true });
  next.score += 10;
  next.moves += 1;
  next.isComplete = isGameWon(next);
  return next;
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
  const targetTop = targetPile.length > 0 ? targetPile[targetPile.length - 1]! : null;
  if (!canPlaceOnTableau(card, targetTop)) return null;

  const next = cloneState(state);
  next.waste.pop();
  next.tableau[toCol]!.push({ ...card, faceUp: true });
  next.score += 5;
  next.moves += 1;
  return next;
}

// ---------------------------------------------------------------------------
// applyMoveTableauToFoundation
// ---------------------------------------------------------------------------

export function applyMoveTableauToFoundation(
  state: GameState,
  fromCol: number,
  foundIdx: number
): GameState | null {
  const pile = state.tableau[fromCol]!;
  if (pile.length === 0) return null;
  const card = pile[pile.length - 1]!;
  if (!card.faceUp) return null;
  const foundPile = state.foundation[foundIdx]!;
  if (!canPlaceOnFoundation(card, foundPile)) return null;

  const next = cloneState(state);
  next.tableau[fromCol]!.pop();
  // Flip the new top card face-up if it exists
  const newPile = next.tableau[fromCol]!;
  if (newPile.length > 0 && !newPile[newPile.length - 1]!.faceUp) {
    newPile[newPile.length - 1]!.faceUp = true;
  }
  next.foundation[foundIdx]!.push({ ...card, faceUp: true });
  next.score += 10;
  next.moves += 1;
  next.isComplete = isGameWon(next);
  return next;
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
  const movingCard = fromPile[fromCardIdx]!;
  if (!movingCard.faceUp) return null;

  const toPile = state.tableau[toCol]!;
  const targetTop = toPile.length > 0 ? toPile[toPile.length - 1]! : null;
  if (!canPlaceOnTableau(movingCard, targetTop)) return null;

  const next = cloneState(state);
  const sequence = next.tableau[fromCol]!.splice(fromCardIdx);
  next.tableau[toCol]!.push(...sequence);

  // Flip the new top of the source pile if face-down
  const srcPile = next.tableau[fromCol]!;
  if (srcPile.length > 0 && !srcPile[srcPile.length - 1]!.faceUp) {
    srcPile[srcPile.length - 1]!.faceUp = true;
  }

  next.score += 5;
  next.moves += 1;
  return next;
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
  const toPile = state.tableau[toCol]!;
  const targetTop = toPile.length > 0 ? toPile[toPile.length - 1]! : null;
  if (!canPlaceOnTableau(card, targetTop)) return null;

  const next = cloneState(state);
  next.foundation[foundIdx]!.pop();
  next.tableau[toCol]!.push({ ...card, faceUp: true });
  next.score = Math.max(0, next.score - 15);
  next.moves += 1;
  return next;
}

// ---------------------------------------------------------------------------
// isGameWon
// ---------------------------------------------------------------------------

export function isGameWon(state: GameState): boolean {
  return state.foundation.reduce((sum, pile) => sum + pile.length, 0) === 52;
}

// ---------------------------------------------------------------------------
// canAutoComplete
// ---------------------------------------------------------------------------

/**
 * Auto-complete is safe when every face-down card has already been revealed
 * (i.e. no hidden cards remain in the tableau) AND the stock/waste are empty
 * or all remaining cards are accessible. In practice the standard condition is:
 * no face-down cards in tableau AND stock is empty.
 */
export function canAutoComplete(state: GameState): boolean {
  if (state.isComplete) return false;
  // Stock must be empty
  if (state.stock.length > 0) return false;
  // No face-down cards in any tableau pile
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
  // Try to move any card to its foundation
  // Waste first
  if (state.waste.length > 0) {
    for (let fi = 0; fi < 4; fi++) {
      const next = applyMoveWasteToFoundation(state, fi);
      if (next) return next;
    }
  }
  // Tableau columns
  for (let col = 0; col < 7; col++) {
    for (let fi = 0; fi < 4; fi++) {
      const next = applyMoveTableauToFoundation(state, col, fi);
      if (next) return next;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// findHints
// ---------------------------------------------------------------------------

export function findHints(state: GameState): HintMove[] {
  const hints: HintMove[] = [];

  // Priority 1: Waste → Foundation
  if (state.waste.length > 0) {
    for (let fi = 0; fi < 4; fi++) {
      const card = state.waste[state.waste.length - 1]!;
      if (canPlaceOnFoundation(card, state.foundation[fi]!)) {
        hints.push({ fromType: "waste", fromIndex: 0, toType: "foundation", toIndex: fi });
      }
    }
  }

  // Priority 2: Tableau → Foundation
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
      }
    }
  }

  // Priority 3: Tableau → Tableau that exposes a face-down card
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const fromPile = state.tableau[fromCol]!;
    const firstFaceUp = fromPile.findIndex((c) => c.faceUp);
    if (firstFaceUp <= 0) continue; // no face-down card below, or pile empty
    // Moving the entire face-up sequence would expose a face-down card
    for (let toCol = 0; toCol < 7; toCol++) {
      if (fromCol === toCol) continue;
      const toPile = state.tableau[toCol]!;
      const targetTop = toPile.length > 0 ? toPile[toPile.length - 1]! : null;
      if (canPlaceOnTableau(fromPile[firstFaceUp]!, targetTop)) {
        hints.push({
          fromType: "tableau",
          fromIndex: fromCol,
          toType: "tableau",
          toIndex: toCol,
          fromCardIndex: firstFaceUp,
        });
      }
    }
  }

  // Priority 4: Waste → Tableau
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1]!;
    for (let toCol = 0; toCol < 7; toCol++) {
      const toPile = state.tableau[toCol]!;
      const targetTop = toPile.length > 0 ? toPile[toPile.length - 1]! : null;
      if (canPlaceOnTableau(card, targetTop)) {
        hints.push({ fromType: "waste", fromIndex: 0, toType: "tableau", toIndex: toCol });
      }
    }
  }

  // Priority 5: Tableau → Tableau (other moves, not exposing face-down)
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const fromPile = state.tableau[fromCol]!;
    const firstFaceUp = fromPile.findIndex((c) => c.faceUp);
    if (firstFaceUp < 0) continue;
    // Only consider moves that don't expose a face-down card (already covered above)
    if (firstFaceUp > 0) continue; // would expose face-down — already in priority 3
    for (let ci = firstFaceUp; ci < fromPile.length; ci++) {
      const movingCard = fromPile[ci]!;
      for (let toCol = 0; toCol < 7; toCol++) {
        if (fromCol === toCol) continue;
        const toPile = state.tableau[toCol]!;
        const targetTop = toPile.length > 0 ? toPile[toPile.length - 1]! : null;
        if (canPlaceOnTableau(movingCard, targetTop)) {
          // Avoid suggesting a King move to an empty pile if the source pile has no face-down cards
          // (it's a pointless shuffle unless it opens something useful — skip to keep hints clean)
          if (movingCard.rank === 13 && toPile.length === 0 && firstFaceUp === 0) {
            // Only suggest if it frees up a non-empty column
            if (fromPile.length === 1) continue; // moving a lone King to empty — pointless
          }
          hints.push({
            fromType: "tableau",
            fromIndex: fromCol,
            toType: "tableau",
            toIndex: toCol,
            fromCardIndex: ci,
          });
        }
      }
    }
  }

  // Deduplicate and cap at 10
  const seen = new Set<string>();
  const unique: HintMove[] = [];
  for (const h of hints) {
    const key = `${h.fromType}-${h.fromIndex}-${h.fromCardIndex ?? ""}-${h.toType}-${h.toIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(h);
    }
    if (unique.length >= 10) break;
  }
  return unique;
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
  const MAX_TIME = 700; // seconds
  const timeBonus = won ? Math.max(0, MAX_TIME - elapsed) : 0;
  const hintPenalty = hintsUsed * 20;
  const total = Math.max(0, score + timeBonus - hintPenalty);

  return {
    baseScore: score,
    timeBonus,
    streakBonus: 0,
    comboBonus: 0,
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

const SUIT_SYMBOLS: Record<Suit, string> = {
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
  const foundStrs = state.foundation.map((pile) => {
    if (pile.length === 0) return "empty";
    return cardStr(pile[pile.length - 1]!);
  });
  lines.push(`Foundation: [${foundStrs.join("] [")}]`);

  // Stock & Waste
  const wasteTop = state.waste.length > 0 ? cardStr(state.waste[state.waste.length - 1]!) : "empty";
  lines.push(`Stock: ${state.stock.length} cards | Waste top: ${wasteTop}`);

  // Tableau
  lines.push("Tableau:");
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col]!;
    if (pile.length === 0) {
      lines.push(`  Col ${col + 1}: empty`);
    } else {
      const cards = pile.map(cardStr).join(" ");
      lines.push(`  Col ${col + 1}: ${cards}`);
    }
  }

  // Stats
  lines.push(`Score: ${state.score} | Moves: ${state.moves} | Hints used: ${state.hintsUsed}`);

  return lines.join("\n");
}
