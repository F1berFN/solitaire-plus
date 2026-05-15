import { useState, useCallback, useRef, useEffect } from "react";
import type { GameState, DrawMode, AIDifficulty, ScoreBreakdown } from "@shared/gameTypes";
import {
  dealGame,
  applyDraw,
  applyMoveWasteToTableau,
  applyMoveWasteToFoundation,
  applyMoveTableauToFoundation,
  applyMoveTableauToTableau,
  applyMoveFoundationToTableau,
  findHints,
  canAutoComplete,
  autoCompleteStep,
  isGameWon,
  calculateFinalScore,
  serializeBoardForLLM,
  type HintMove,
} from "./engine";
import { getAINextMove, getAIThinkDelay, getAIFoundationCount } from "./aiEngine";
import { nanoid } from "nanoid";

export interface UseGameStateReturn {
  state: GameState | null;
  aiState: GameState | null;
  aiProgress: number;
  hint: HintMove | null;
  isAutoCompleting: boolean;
  scoreBreakdown: ScoreBreakdown | null;
  seed: string;

  startGame: (seed?: string, drawMode?: DrawMode, aiDifficulty?: AIDifficulty | null) => void;
  draw: () => void;
  moveWasteToTableau: (toCol: number) => void;
  moveWasteToFoundation: (foundIdx: number) => void;
  moveTableauToFoundation: (fromCol: number, foundIdx: number) => void;
  moveTableauToTableau: (fromCol: number, fromCardIdx: number, toCol: number) => void;
  moveFoundationToTableau: (foundIdx: number, toCol: number) => void;
  undo: () => void;
  useHint: () => void;
  clearHint: () => void;
  triggerAutoComplete: () => void;
  getBoardForLLM: () => string;
}

export function useGameState(
  onGameComplete?: (breakdown: ScoreBreakdown, won: boolean) => void
): UseGameStateReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [aiState, setAiState] = useState<GameState | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [hint, setHint] = useState<HintMove | null>(null);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [seed, setSeed] = useState("");
  const historyRef = useRef<GameState[]>([]);
  const aiDifficultyRef = useRef<AIDifficulty | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  const checkWin = useCallback((newState: GameState) => {
    if (newState.isComplete && !completedRef.current) {
      completedRef.current = true;
      const elapsed = Math.floor((Date.now() - newState.startTime) / 1000);
      const breakdown = calculateFinalScore(
        newState.score,
        elapsed,
        newState.moves,
        newState.hintsUsed,
        true
      );
      setScoreBreakdown(breakdown);
      onGameComplete?.(breakdown, true);
    }
  }, [onGameComplete]);

  const applyState = useCallback((newState: GameState) => {
    historyRef.current = [...historyRef.current, newState];
    setState(newState);
    checkWin(newState);
  }, [checkWin]);

  // AI loop
  const scheduleAIMove = useCallback((currentAiState: GameState) => {
    if (!aiDifficultyRef.current || isGameWon(currentAiState)) return;
    const delay = getAIThinkDelay(aiDifficultyRef.current);
    aiTimerRef.current = setTimeout(() => {
      const result = getAINextMove(currentAiState, aiDifficultyRef.current!);
      if (result) {
        setAiState(result.nextState);
        setAiProgress(getAIFoundationCount(result.nextState));
        if (!isGameWon(result.nextState)) {
          scheduleAIMove(result.nextState);
        }
      }
    }, delay);
  }, []);

  const startGame = useCallback((
    gameSeed?: string,
    drawMode: DrawMode = "draw1",
    aiDifficulty: AIDifficulty | null = null
  ) => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const s = gameSeed ?? nanoid(16);
    setSeed(s);
    completedRef.current = false;
    const newState = dealGame(s, drawMode);
    historyRef.current = [newState];
    setState(newState);
    setScoreBreakdown(null);
    setHint(null);
    setIsAutoCompleting(false);

    aiDifficultyRef.current = aiDifficulty;
    if (aiDifficulty) {
      const aiInitial = dealGame(s, drawMode);
      setAiState(aiInitial);
      setAiProgress(0);
      scheduleAIMove(aiInitial);
    } else {
      setAiState(null);
      setAiProgress(0);
    }
  }, [scheduleAIMove]);

  const draw = useCallback(() => {
    if (!state) return;
    applyState(applyDraw(state));
    setHint(null);
  }, [state, applyState]);

  const moveWasteToTableau = useCallback((toCol: number) => {
    if (!state) return;
    const next = applyMoveWasteToTableau(state, toCol);
    if (next) { applyState(next); setHint(null); }
  }, [state, applyState]);

  const moveWasteToFoundation = useCallback((foundIdx: number) => {
    if (!state) return;
    const next = applyMoveWasteToFoundation(state, foundIdx);
    if (next) { applyState(next); setHint(null); }
  }, [state, applyState]);

  const moveTableauToFoundation = useCallback((fromCol: number, foundIdx: number) => {
    if (!state) return;
    const next = applyMoveTableauToFoundation(state, fromCol, foundIdx);
    if (next) { applyState(next); setHint(null); }
  }, [state, applyState]);

  const moveTableauToTableau = useCallback((fromCol: number, fromCardIdx: number, toCol: number) => {
    if (!state) return;
    const next = applyMoveTableauToTableau(state, fromCol, fromCardIdx, toCol);
    if (next) { applyState(next); setHint(null); }
  }, [state, applyState]);

  const moveFoundationToTableau = useCallback((foundIdx: number, toCol: number) => {
    if (!state) return;
    const next = applyMoveFoundationToTableau(state, foundIdx, toCol);
    if (next) { applyState(next); setHint(null); }
  }, [state, applyState]);

  const undo = useCallback(() => {
    if (historyRef.current.length <= 1) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setState(historyRef.current[historyRef.current.length - 1]!);
    setHint(null);
  }, []);

  const useHint = useCallback(() => {
    if (!state) return;
    const hints = findHints(state);
    if (hints.length > 0) {
      setHint(hints[0]!);
      setState({ ...state, hintsUsed: state.hintsUsed + 1, score: Math.max(0, state.score - 20) });
    }
  }, [state]);

  const clearHint = useCallback(() => setHint(null), []);

  const triggerAutoComplete = useCallback(() => {
    if (!state || !canAutoComplete(state)) return;
    setIsAutoCompleting(true);
    const runStep = (current: GameState) => {
      const next = autoCompleteStep(current);
      if (next) {
        setState(next);
        if (!isGameWon(next)) {
          setTimeout(() => runStep(next), 80);
        } else {
          setIsAutoCompleting(false);
          completedRef.current = true;
          const elapsed = Math.floor((Date.now() - next.startTime) / 1000);
          const breakdown = calculateFinalScore(next.score, elapsed, next.moves, next.hintsUsed, true);
          setScoreBreakdown(breakdown);
          onGameComplete?.(breakdown, true);
        }
      } else {
        setIsAutoCompleting(false);
      }
    };
    runStep(state);
  }, [state, onGameComplete]);

  const getBoardForLLM = useCallback(() => {
    if (!state) return "";
    return serializeBoardForLLM(state);
  }, [state]);

  // Cleanup AI timer on unmount
  useEffect(() => {
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, []);

  return {
    state,
    aiState,
    aiProgress,
    hint,
    isAutoCompleting,
    scoreBreakdown,
    seed,
    startGame,
    draw,
    moveWasteToTableau,
    moveWasteToFoundation,
    moveTableauToFoundation,
    moveTableauToTableau,
    moveFoundationToTableau,
    undo,
    useHint,
    clearHint,
    triggerAutoComplete,
    getBoardForLLM,
  };
}
