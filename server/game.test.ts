import { describe, expect, it } from "vitest";
import {
  dealGame,
  createDeck,
  shuffleDeck,
  canPlaceOnTableau,
  canPlaceOnFoundation,
  applyDraw,
  applyMoveWasteToTableau,
  applyMoveWasteToFoundation,
  applyMoveTableauToFoundation,
  applyMoveTableauToTableau,
  findHints,
  canAutoComplete,
  isGameWon,
  calculateFinalScore,
  serializeBoardForLLM,
} from "../client/src/game/engine";
import type { Card, GameState } from "../shared/gameTypes";

// ─── Deck Tests ───────────────────────────────────────────────────────────────

describe("createDeck", () => {
  it("creates 52 unique cards", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(52);
  });

  it("has 13 cards per suit", () => {
    const deck = createDeck();
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    for (const suit of suits) {
      expect(deck.filter((c) => c.suit === suit)).toHaveLength(13);
    }
  });
});

describe("shuffleDeck", () => {
  it("produces same order for same seed", () => {
    const deck = createDeck();
    const s1 = shuffleDeck(deck, "test-seed-123");
    const s2 = shuffleDeck(deck, "test-seed-123");
    expect(s1.map((c) => c.id)).toEqual(s2.map((c) => c.id));
  });

  it("produces different orders for different seeds", () => {
    const deck = createDeck();
    const s1 = shuffleDeck(deck, "seed-a");
    const s2 = shuffleDeck(deck, "seed-b");
    expect(s1.map((c) => c.id)).not.toEqual(s2.map((c) => c.id));
  });
});

// ─── Deal Tests ───────────────────────────────────────────────────────────────

describe("dealGame", () => {
  it("deals 7 tableau piles with correct card counts", () => {
    const state = dealGame("test-seed", "draw1");
    expect(state.tableau).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      expect(state.tableau[i]).toHaveLength(i + 1);
    }
  });

  it("has exactly 28 cards in tableau (1+2+...+7)", () => {
    const state = dealGame("test-seed", "draw1");
    const total = state.tableau.reduce((s, p) => s + p.length, 0);
    expect(total).toBe(28);
  });

  it("has 24 cards in stock", () => {
    const state = dealGame("test-seed", "draw1");
    expect(state.stock).toHaveLength(24);
  });

  it("top card of each tableau pile is face up", () => {
    const state = dealGame("test-seed", "draw1");
    for (const pile of state.tableau) {
      expect(pile[pile.length - 1]!.faceUp).toBe(true);
    }
  });

  it("non-top tableau cards are face down", () => {
    const state = dealGame("test-seed", "draw1");
    for (const pile of state.tableau) {
      for (let i = 0; i < pile.length - 1; i++) {
        expect(pile[i]!.faceUp).toBe(false);
      }
    }
  });

  it("starts with score 0 and moves 0", () => {
    const state = dealGame("test-seed", "draw1");
    expect(state.score).toBe(0);
    expect(state.moves).toBe(0);
    expect(state.hintsUsed).toBe(0);
    expect(state.isComplete).toBe(false);
  });
});

// ─── Move Validation Tests ────────────────────────────────────────────────────

describe("canPlaceOnTableau", () => {
  const makeCard = (suit: string, rank: number, faceUp = true): Card => ({
    id: `${suit}-${rank}`,
    suit: suit as Card["suit"],
    rank: rank as Card["rank"],
    faceUp,
  });

  it("allows red on black of one rank higher", () => {
    expect(canPlaceOnTableau(makeCard("hearts", 5), makeCard("spades", 6))).toBe(true);
    expect(canPlaceOnTableau(makeCard("diamonds", 9), makeCard("clubs", 10))).toBe(true);
  });

  it("disallows same color", () => {
    expect(canPlaceOnTableau(makeCard("hearts", 5), makeCard("diamonds", 6))).toBe(false);
    expect(canPlaceOnTableau(makeCard("spades", 5), makeCard("clubs", 6))).toBe(false);
  });

  it("disallows wrong rank", () => {
    expect(canPlaceOnTableau(makeCard("hearts", 4), makeCard("spades", 6))).toBe(false);
    expect(canPlaceOnTableau(makeCard("hearts", 6), makeCard("spades", 6))).toBe(false);
  });

  it("only King can go on empty pile", () => {
    expect(canPlaceOnTableau(makeCard("hearts", 13), null)).toBe(true);
    expect(canPlaceOnTableau(makeCard("hearts", 12), null)).toBe(false);
  });

  it("disallows placing on face-down card", () => {
    expect(canPlaceOnTableau(makeCard("hearts", 5), makeCard("spades", 6, false))).toBe(false);
  });
});

describe("canPlaceOnFoundation", () => {
  const makeCard = (suit: string, rank: number): Card => ({
    id: `${suit}-${rank}`,
    suit: suit as Card["suit"],
    rank: rank as Card["rank"],
    faceUp: true,
  });

  it("allows Ace on empty foundation", () => {
    expect(canPlaceOnFoundation(makeCard("hearts", 1), [])).toBe(true);
  });

  it("disallows non-Ace on empty foundation", () => {
    expect(canPlaceOnFoundation(makeCard("hearts", 2), [])).toBe(false);
  });

  it("allows sequential same-suit card", () => {
    expect(canPlaceOnFoundation(makeCard("hearts", 3), [makeCard("hearts", 1), makeCard("hearts", 2)])).toBe(true);
  });

  it("disallows wrong suit", () => {
    expect(canPlaceOnFoundation(makeCard("spades", 2), [makeCard("hearts", 1)])).toBe(false);
  });
});

// ─── Apply Move Tests ─────────────────────────────────────────────────────────

describe("applyDraw", () => {
  it("draws 1 card in draw1 mode", () => {
    const state = dealGame("test-seed", "draw1");
    const stockBefore = state.stock.length;
    const next = applyDraw(state);
    expect(next.stock).toHaveLength(stockBefore - 1);
    expect(next.waste).toHaveLength(1);
    expect(next.waste[0]!.faceUp).toBe(true);
  });

  it("draws 3 cards in draw3 mode", () => {
    const state = dealGame("test-seed", "draw3");
    const stockBefore = state.stock.length;
    const next = applyDraw(state);
    expect(next.stock).toHaveLength(stockBefore - 3);
    expect(next.waste).toHaveLength(3);
  });

  it("recycles waste to stock when stock is empty", () => {
    let state = dealGame("test-seed", "draw1");
    // Draw all cards
    while (state.stock.length > 0) {
      state = applyDraw(state);
    }
    expect(state.waste.length).toBeGreaterThan(0);
    const recycled = applyDraw(state);
    expect(recycled.waste).toHaveLength(0);
    expect(recycled.stock.length).toBeGreaterThan(0);
  });

  it("increments move count", () => {
    const state = dealGame("test-seed", "draw1");
    const next = applyDraw(state);
    expect(next.moves).toBe(state.moves + 1);
  });
});

// ─── Scoring Tests ────────────────────────────────────────────────────────────

describe("calculateFinalScore", () => {
  it("gives time bonus for fast wins", () => {
    const fast = calculateFinalScore(500, 100, 50, 0, true);
    const slow = calculateFinalScore(500, 600, 50, 0, true);
    expect(fast.timeBonus).toBeGreaterThan(slow.timeBonus);
  });

  it("gives efficiency bonus for fewer moves", () => {
    const efficient = calculateFinalScore(500, 300, 30, 0, true);
    const inefficient = calculateFinalScore(500, 300, 80, 0, true);
    expect(efficient.comboBonus).toBeGreaterThan(inefficient.comboBonus);
  });

  it("penalizes hints", () => {
    const noHints = calculateFinalScore(500, 300, 50, 0, true);
    const withHints = calculateFinalScore(500, 300, 50, 3, true);
    expect(withHints.total).toBeLessThan(noHints.total);
    expect(withHints.hintPenalty).toBe(60);
  });

  it("gives no time bonus for losses", () => {
    const loss = calculateFinalScore(200, 100, 50, 0, false);
    expect(loss.timeBonus).toBe(0);
    expect(loss.comboBonus).toBe(0);
  });

  it("total is never negative", () => {
    const result = calculateFinalScore(0, 1000, 200, 10, false);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});

// ─── Hint System Tests ────────────────────────────────────────────────────────

describe("findHints", () => {
  it("returns sorted hints by priority", () => {
    const state = dealGame("hint-test-seed", "draw1");
    const hints = findHints(state);
    for (let i = 0; i < hints.length - 1; i++) {
      expect(hints[i]!.priority).toBeGreaterThanOrEqual(hints[i + 1]!.priority);
    }
  });
});

// ─── isGameWon Tests ──────────────────────────────────────────────────────────

describe("isGameWon", () => {
  it("returns false for new game", () => {
    const state = dealGame("test-seed", "draw1");
    expect(isGameWon(state)).toBe(false);
  });

  it("returns true when all 4 foundations have 13 cards", () => {
    const makeCard = (suit: string, rank: number): Card => ({
      id: `${suit}-${rank}`,
      suit: suit as Card["suit"],
      rank: rank as Card["rank"],
      faceUp: true,
    });
    const wonState: GameState = {
      tableau: [[], [], [], [], [], [], []],
      foundation: [
        Array.from({ length: 13 }, (_, i) => makeCard("hearts", i + 1)),
        Array.from({ length: 13 }, (_, i) => makeCard("diamonds", i + 1)),
        Array.from({ length: 13 }, (_, i) => makeCard("clubs", i + 1)),
        Array.from({ length: 13 }, (_, i) => makeCard("spades", i + 1)),
      ],
      stock: [],
      waste: [],
      score: 1000,
      moves: 100,
      hintsUsed: 0,
      drawMode: "draw1",
      startTime: Date.now(),
      isComplete: true,
    };
    expect(isGameWon(wonState)).toBe(true);
  });
});

// ─── serializeBoardForLLM Tests ───────────────────────────────────────────────

describe("serializeBoardForLLM", () => {
  it("produces a non-empty string", () => {
    const state = dealGame("test-seed", "draw1");
    const serialized = serializeBoardForLLM(state);
    expect(serialized).toBeTruthy();
    expect(typeof serialized).toBe("string");
  });

  it("includes tableau and foundation sections", () => {
    const state = dealGame("test-seed", "draw1");
    const serialized = serializeBoardForLLM(state);
    expect(serialized).toContain("T1:");
    expect(serialized).toContain("Foundation:");
  });
});
