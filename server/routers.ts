import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { guestRouter } from "./guestRouter";
import { userRouter } from "./userRouter";
import { applyGameElo, updateUserElo, updateGuestElo, getUserElo } from "./eloDb";
import { invokeLLM } from "./_core/llm";
import {
  getOrCreateUserStats,
  updateUserPreferences,
  saveGame,
  getUserGames,
  updateUserStatsAfterGame,
  getLeaderboard,
  getEloLeaderboard,
  getOrCreateDailyChallenge,
  submitDailyChallenge,
  getDailyChallengeLeaderboard,
  getUserDailyChallengeEntry,
  getUserAchievements,
  unlockAchievement,
  createRoom,
  getRoomByCode,
  updateRoom,
} from "./db";
import { ACHIEVEMENTS } from "@shared/achievements";
import { nanoid } from "nanoid";

// ─── Auth Router ──────────────────────────────────────────────────────────────

const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ─── User Router ──────────────────────────────────────────────────────────────


// ─── Game Router ──────────────────────────────────────────────────────────────

const gameRouter = router({
  getUserGames: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return getUserGames(ctx.user.id, input.limit);
    }),

  saveResult: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["solo", "vsAI", "vsPlayer", "daily"]),
        drawMode: z.enum(["draw1", "draw3"]),
        seed: z.string(),
        score: z.number(),
        durationSecs: z.number(),
        moves: z.number(),
        hintsUsed: z.number(),
        won: z.boolean(),
        theme: z.string(),
        aiDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
        aiScore: z.number().optional(),
        opponentId: z.number().optional(),
        opponentScore: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gameId = await saveGame({ userId: ctx.user.id, ...input });
      await updateUserStatsAfterGame(
        ctx.user.id,
        input.won,
        input.score,
        input.durationSecs,
        input.hintsUsed
      );

      // Calculate and apply ELO changes
      let eloChange = 0;
      if (input.mode === "vsAI" && input.won) {
        // Solo vs AI: fixed ELO bonus based on difficulty
        const difficultyMultiplier = {
          easy: 1,
          medium: 1.5,
          hard: 2,
        }[input.aiDifficulty || "medium"] || 1.5;
        eloChange = Math.round(20 * difficultyMultiplier);
        await updateUserElo(ctx.user.id, (await getUserElo(ctx.user.id)) + eloChange);
      } else if (input.mode === "vsPlayer" && input.opponentId) {
        // Multiplayer: calculate ELO based on opponent rating
        const winnerId = input.won ? ctx.user.id : input.opponentId;
        const loserId = input.won ? input.opponentId : ctx.user.id;
        const eloResult = await applyGameElo(winnerId, loserId, false);
        if (eloResult && input.won) {
          eloChange = eloResult.winnerEloChange;
        } else if (eloResult) {
          eloChange = eloResult.loserEloChange;
        }
      } else if (input.mode === "solo" && input.won) {
        // Solo play: small fixed bonus
        eloChange = 10;
        await updateUserElo(ctx.user.id, (await getUserElo(ctx.user.id)) + eloChange);
      }

      // Store ELO change for client display
      sessionStorage?.setItem(`lastEloChange_${ctx.user.id}`, String(eloChange));

      // Check achievements
      const stats = await getOrCreateUserStats(ctx.user.id);
      const newAchievements: string[] = [];

      const checkAndUnlock = async (key: string, condition: boolean) => {
        if (condition) {
          const unlocked = await unlockAchievement(ctx.user.id, key);
          if (unlocked) newAchievements.push(key);
        }
      };

      if (input.won) {
        await checkAndUnlock("first_win", true);
        await checkAndUnlock("speed_demon", input.durationSecs < 180);
        await checkAndUnlock("no_hints", input.hintsUsed === 0);
        await checkAndUnlock("high_scorer", input.score >= 5000);
        await checkAndUnlock("flawless", input.score >= 8000);
        await checkAndUnlock("draw3_master", input.drawMode === "draw3");
        await checkAndUnlock("beat_ai_hard", input.mode === "vsAI" && input.aiDifficulty === "hard");
        await checkAndUnlock("multiplayer_win", input.mode === "vsPlayer");
        if (stats) {
          await checkAndUnlock("win_streak_3", stats.currentStreak >= 3);
          await checkAndUnlock("win_streak_10", stats.currentStreak >= 10);
          await checkAndUnlock("centurion", stats.gamesPlayed >= 100);
        }
      }

      return { gameId, newAchievements, eloChange };
    }),
});

// ─── Leaderboard Router ───────────────────────────────────────────────────────

const leaderboardRouter = router({
  get: publicProcedure
    .input(z.object({ mode: z.enum(["solo", "vsAI", "vsPlayer"]), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return getLeaderboard(input.mode, input.limit);
    }),

  elo: publicProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return getEloLeaderboard(input.limit);
    }),

  daily: publicProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input }) => {
      const today = input.date ?? new Date().toISOString().split("T")[0];
      const challenge = await getOrCreateDailyChallenge(today!);
      if (!challenge) return { challenge: null, entries: [] };
      const entries = await getDailyChallengeLeaderboard(challenge.id, 50);
      return { challenge, entries };
    }),
});

// ─── Daily Challenge Router ───────────────────────────────────────────────────

const dailyRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0]!;
    const challenge = await getOrCreateDailyChallenge(today);
    if (!challenge) return { challenge: null, userEntry: null };
    const userEntry = ctx.user
      ? await getUserDailyChallengeEntry(ctx.user.id, challenge.id)
      : null;
    return { challenge, userEntry };
  }),

  submit: protectedProcedure
    .input(
      z.object({
        score: z.number(),
        durationSecs: z.number(),
        moves: z.number(),
        hintsUsed: z.number(),
        won: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().split("T")[0]!;
      const challenge = await getOrCreateDailyChallenge(today);
      if (!challenge) throw new Error("No daily challenge found");
      await submitDailyChallenge(ctx.user.id, challenge.id, input);
      if (input.won) {
        await saveGame({
          userId: ctx.user.id,
          mode: "daily",
          drawMode: challenge.drawMode,
          seed: challenge.seed,
          ...input,
          theme: "classic",
        });
        await updateUserStatsAfterGame(
          ctx.user.id,
          input.won,
          input.score,
          input.durationSecs,
          input.hintsUsed
        );
      }
      return { success: true };
    }),
});

// ─── Achievements Router ──────────────────────────────────────────────────────

const achievementsRouter = router({
  getAll: publicProcedure.query(() => ACHIEVEMENTS),

  getUserAchievements: protectedProcedure.query(async ({ ctx }) => {
    return getUserAchievements(ctx.user.id);
  }),
});

// ─── Multiplayer Router ───────────────────────────────────────────────────────

const multiplayerRouter = router({
  createRoom: protectedProcedure
    .input(z.object({ drawMode: z.enum(["draw1", "draw3"]) }))
    .mutation(async ({ ctx, input }) => {
      const code = nanoid(6).toUpperCase();
      const seed = nanoid(16);
      const room = await createRoom({
        code,
        hostId: ctx.user.id,
        hostIsGuest: false,
        seed,
        drawMode: input.drawMode,
        status: "waiting",
      });
      return room;
    }),

  createRoomAsGuest: publicProcedure
    .input(z.object({ drawMode: z.enum(["draw1", "draw3"]), guestPlayerId: z.number() }))
    .mutation(async ({ input }) => {
      const code = nanoid(6).toUpperCase();
      const seed = nanoid(16);
      const room = await createRoom({
        code,
        hostId: input.guestPlayerId,
        hostIsGuest: true,
        hostGuestPlayerId: input.guestPlayerId,
        seed,
        drawMode: input.drawMode,
        status: "waiting",
      });
      return room;
    }),

  joinRoom: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomByCode(input.code.toUpperCase());
      if (!room) throw new Error("Room not found");
      if (room.status !== "waiting") throw new Error("Room is not available");
      if (room.hostId === ctx.user.id && !room.hostIsGuest) return room; // already host
      await updateRoom(input.code.toUpperCase(), { guestId: ctx.user.id, guestIsGuest: false });
      return getRoomByCode(input.code.toUpperCase());
    }),

  joinRoomAsGuest: publicProcedure
    .input(z.object({ code: z.string(), guestPlayerId: z.number() }))
    .mutation(async ({ input }) => {
      const room = await getRoomByCode(input.code.toUpperCase());
      if (!room) throw new Error("Room not found");
      if (room.status !== "waiting") throw new Error("Room is not available");
      if (room.hostIsGuest && room.hostGuestPlayerId === input.guestPlayerId) return room; // already host
      await updateRoom(input.code.toUpperCase(), { 
        guestId: input.guestPlayerId, 
        guestIsGuest: true,
        guestGuestPlayerId: input.guestPlayerId,
      });
      return getRoomByCode(input.code.toUpperCase());
    }),

  getRoom: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const room = await getRoomByCode(input.code.toUpperCase());
      if (!room) return null;
      // Enrich room with guest player names if needed
      return room;
    }),
});

// ─── Coach Router (LLM) ───────────────────────────────────────────────────────

const coachRouter = router({
  analyze: protectedProcedure
    .input(
      z.object({
        boardState: z.string(), // JSON serialized board
        moveCount: z.number(),
        score: z.number(),
        hintsUsed: z.number(),
        mode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert Klondike Solitaire coach named "Ace". Your role is to analyze the current board state and provide strategic, encouraging, and insightful commentary. Keep responses concise (2-4 sentences). Be specific about card moves when possible. Use a warm, expert tone — like a seasoned card player coaching a friend. Occasionally add personality and humor.`,
          },
          {
            role: "user",
            content: `Current game state:
- Mode: ${input.mode}
- Moves made: ${input.moveCount}
- Current score: ${input.score}
- Hints used: ${input.hintsUsed}
- Board: ${input.boardState}

Please analyze this board and give me your best strategic advice. What should I focus on? Are there any key moves I should prioritize?`,
          },
        ],
      });

      const content = response?.choices?.[0]?.message?.content ?? "Keep playing — you're doing great!";
      return { advice: content };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  user: userRouter,
  game: gameRouter,
  leaderboard: leaderboardRouter,
  daily: dailyRouter,
  achievements: achievementsRouter,
  multiplayer: multiplayerRouter,
  coach: coachRouter,
  guest: guestRouter,
});

export type AppRouter = typeof appRouter;
