export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_win",
    name: "First Victory",
    description: "Win your first game of Solitaire.",
    icon: "🏆",
    rarity: "common",
  },
  {
    key: "speed_demon",
    name: "Speed Demon",
    description: "Complete a game in under 3 minutes.",
    icon: "⚡",
    rarity: "rare",
  },
  {
    key: "no_hints",
    name: "No Hints Used",
    description: "Win a game without using any hints.",
    icon: "🧠",
    rarity: "rare",
  },
  {
    key: "win_streak_3",
    name: "Win Streak",
    description: "Win 3 games in a row.",
    icon: "🔥",
    rarity: "rare",
  },
  {
    key: "win_streak_10",
    name: "On Fire",
    description: "Win 10 games in a row.",
    icon: "🌋",
    rarity: "epic",
  },
  {
    key: "high_scorer",
    name: "High Scorer",
    description: "Achieve a score of 5000 or more in a single game.",
    icon: "💎",
    rarity: "epic",
  },
  {
    key: "beat_ai_hard",
    name: "AI Slayer",
    description: "Beat the AI on Hard difficulty.",
    icon: "🤖",
    rarity: "epic",
  },
  {
    key: "multiplayer_win",
    name: "Challenger",
    description: "Win your first online multiplayer match.",
    icon: "🌐",
    rarity: "rare",
  },
  {
    key: "daily_champion",
    name: "Daily Champion",
    description: "Top the daily challenge leaderboard.",
    icon: "📅",
    rarity: "legendary",
  },
  {
    key: "centurion",
    name: "Centurion",
    description: "Play 100 games.",
    icon: "💯",
    rarity: "epic",
  },
  {
    key: "draw3_master",
    name: "Draw 3 Master",
    description: "Win a game in Draw 3 mode.",
    icon: "🃏",
    rarity: "rare",
  },
  {
    key: "flawless",
    name: "Flawless",
    description: "Win with a score above 8000.",
    icon: "✨",
    rarity: "legendary",
  },
];

export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
