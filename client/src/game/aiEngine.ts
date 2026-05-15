import type { GameState, AIDifficulty } from "@shared/gameTypes";
import {
  applyDraw,
  applyMoveTableauToFoundation,
  applyMoveTableauToTableau,
  applyMoveWasteToFoundation,
  applyMoveWasteToTableau,
  findHints,
  canAutoComplete,
  autoCompleteStep,
  isGameWon,
} from "./engine";

export interface AIMove {
  type: string;
  description: string;
}

// Returns the next best state for the AI to transition to
export function getAINextMove(
  state: GameState,
  difficulty: AIDifficulty
): { nextState: GameState; move: AIMove } | null {
  if (isGameWon(state)) return null;

  if (canAutoComplete(state)) {
    const next = autoCompleteStep(state);
    if (next) return { nextState: next, move: { type: "auto", description: "Auto-complete" } };
  }

  // Easy: random valid move with some delay
  if (difficulty === "easy") {
    return getRandomMove(state);
  }

  // Medium: greedy best move (prefer foundation)
  if (difficulty === "medium") {
    return getGreedyMove(state);
  }

  // Hard: use hint system with lookahead priority
  return getHardMove(state);
}

function getRandomMove(state: GameState): { nextState: GameState; move: AIMove } | null {
  const moves: Array<() => GameState | null> = [];

  // Draw from stock
  moves.push(() => applyDraw(state));

  // Waste to foundation
  for (let fi = 0; fi < 4; fi++) {
    moves.push(() => applyMoveWasteToFoundation(state, fi));
  }

  // Waste to tableau
  for (let ti = 0; ti < 7; ti++) {
    moves.push(() => applyMoveWasteToTableau(state, ti));
  }

  // Tableau to foundation
  for (let ti = 0; ti < 7; ti++) {
    for (let fi = 0; fi < 4; fi++) {
      moves.push(() => applyMoveTableauToFoundation(state, ti, fi));
    }
  }

  // Tableau to tableau
  for (let from = 0; from < 7; from++) {
    const pile = state.tableau[from]!;
    const firstFaceUp = pile.findIndex((c) => c.faceUp);
    if (firstFaceUp < 0) continue;
    for (let to = 0; to < 7; to++) {
      if (from === to) continue;
      for (let ci = firstFaceUp; ci < pile.length; ci++) {
        moves.push(() => applyMoveTableauToTableau(state, from, ci, to));
      }
    }
  }

  // Shuffle and try
  const shuffled = moves.sort(() => Math.random() - 0.5);
  for (const move of shuffled) {
    const next = move();
    if (next && next !== state) {
      return { nextState: next, move: { type: "random", description: "Making a move..." } };
    }
  }
  return null;
}

function getGreedyMove(state: GameState): { nextState: GameState; move: AIMove } | null {
  // Priority: foundation > expose face-down > waste to tableau > draw
  for (let fi = 0; fi < 4; fi++) {
    const next = applyMoveWasteToFoundation(state, fi);
    if (next) return { nextState: next, move: { type: "foundation", description: "Moving to foundation" } };
  }
  for (let ti = 0; ti < 7; ti++) {
    for (let fi = 0; fi < 4; fi++) {
      const next = applyMoveTableauToFoundation(state, ti, fi);
      if (next) return { nextState: next, move: { type: "foundation", description: "Moving to foundation" } };
    }
  }
  // Expose face-down cards
  for (let from = 0; from < 7; from++) {
    const pile = state.tableau[from]!;
    const firstFaceUp = pile.findIndex((c) => c.faceUp);
    if (firstFaceUp <= 0) continue; // No face-down below
    for (let to = 0; to < 7; to++) {
      if (from === to) continue;
      const next = applyMoveTableauToTableau(state, from, firstFaceUp, to);
      if (next) return { nextState: next, move: { type: "tableau", description: "Exposing card" } };
    }
  }
  // Waste to tableau
  for (let ti = 0; ti < 7; ti++) {
    const next = applyMoveWasteToTableau(state, ti);
    if (next) return { nextState: next, move: { type: "waste", description: "Playing from waste" } };
  }
  // Draw
  const drawn = applyDraw(state);
  if (drawn !== state) return { nextState: drawn, move: { type: "draw", description: "Drawing cards" } };
  return null;
}

function getHardMove(state: GameState): { nextState: GameState; move: AIMove } | null {
  const hints = findHints(state);
  if (hints.length > 0) {
    const best = hints[0]!;
    let next: GameState | null = null;

    if (best.fromType === "waste" && best.toType === "foundation") {
      next = applyMoveWasteToFoundation(state, best.toIndex);
    } else if (best.fromType === "waste" && best.toType === "tableau") {
      next = applyMoveWasteToTableau(state, best.toIndex);
    } else if (best.fromType === "tableau" && best.toType === "foundation") {
      next = applyMoveTableauToFoundation(state, best.fromIndex, best.toIndex);
    } else if (best.fromType === "tableau" && best.toType === "tableau") {
      const pile = state.tableau[best.fromIndex]!;
      const firstFaceUp = pile.findIndex((c) => c.faceUp);
      if (firstFaceUp >= 0) {
        next = applyMoveTableauToTableau(state, best.fromIndex, firstFaceUp, best.toIndex);
      }
    }

    if (next) return { nextState: next, move: { type: "hint", description: "Optimal move" } };
  }

  // Draw if no hints
  const drawn = applyDraw(state);
  if (drawn !== state) return { nextState: drawn, move: { type: "draw", description: "Drawing cards" } };
  return null;
}

// AI think delay in ms based on difficulty
export function getAIThinkDelay(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case "easy": return 2000 + Math.random() * 1500;
    case "medium": return 900 + Math.random() * 600;
    case "hard": return 350 + Math.random() * 250;
  }
}

export function getAIFoundationCount(state: GameState): number {
  return state.foundation.reduce((sum, pile) => sum + pile.length, 0);
}
