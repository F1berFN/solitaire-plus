export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface GameState {
  tableau: Card[][];   // 7 piles
  foundation: Card[][]; // 4 piles (one per suit)
  stock: Card[];
  waste: Card[];
  score: number;
  moves: number;
  hintsUsed: number;
  drawMode: "draw1" | "draw3";
  startTime: number;
  isComplete: boolean;
}

export type GameMode = "solo" | "vsAI" | "vsPlayer" | "daily";
export type DrawMode = "draw1" | "draw3";
export type AIDifficulty = "easy" | "medium" | "hard";

export type Theme = "classic" | "dark-neon" | "space" | "nature" | "retro-pixel";
export type CardBack = "default" | "waves" | "diamonds" | "stars" | "pixels";

export interface MoveRecord {
  type: "tableau-tableau" | "tableau-foundation" | "waste-tableau" | "waste-foundation" | "stock-draw" | "foundation-tableau" | "flip";
  from: string;
  to: string;
  cards: Card[];
  scoreChange: number;
  timestamp: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  timeBonus: number;
  streakBonus: number;
  comboBonus: number;
  hintPenalty: number;
  total: number;
  moves: number;
  durationSecs: number;
}

// Socket.IO event types for multiplayer
export interface RoomState {
  code: string;
  hostId: number;
  hostName: string;
  guestId?: number;
  guestName?: string;
  seed: string;
  drawMode: DrawMode;
  status: "waiting" | "playing" | "finished";
  hostProgress: number; // 0-52 (cards in foundation)
  guestProgress: number;
  hostScore: number;
  guestScore: number;
  hostWon?: boolean;
}

export interface SocketEvents {
  // Client → Server
  "room:join": (code: string, userId: number, userName: string) => void;
  "room:ready": (code: string) => void;
  "game:move": (code: string, progress: number, score: number) => void;
  "game:complete": (code: string, score: number, won: boolean) => void;
  "room:leave": (code: string) => void;

  // Server → Client
  "room:updated": (state: RoomState) => void;
  "game:started": (state: RoomState) => void;
  "opponent:move": (progress: number, score: number) => void;
  "opponent:won": (opponentScore: number) => void;
  "opponent:disconnected": () => void;
}
