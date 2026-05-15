import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import EloLeaderboardPage from "@/pages/EloLeaderboard";
import SettingsPage from "@/pages/Settings";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import GamePage from "./pages/Game";
import LeaderboardPage from "./pages/Leaderboard";
import ProfilePage from "./pages/Profile";
import DailyChallengePage from "./pages/DailyChallenge";
import MultiplayerPage from "./pages/Multiplayer";
import type { GameMode, DrawMode, Theme, CardBack, AIDifficulty } from "@shared/gameTypes";

interface GameConfig {
  mode: GameMode;
  drawMode: DrawMode;
  theme: Theme;
  cardBack: CardBack;
  aiDifficulty?: AIDifficulty;
  seed?: string;
}

function GameRoute() {
  const [, navigate] = useLocation();
  // Read config from sessionStorage (set by Home page)
  let config: GameConfig | undefined;
  try {
    const raw = sessionStorage.getItem("gameConfig");
    if (raw) config = JSON.parse(raw) as GameConfig;
  } catch {}

  return (
    <GamePage
      config={config}
      onExit={() => navigate("/")}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/game" component={GameRoute} />
      <Route path="/multiplayer" component={MultiplayerPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/elo" component={EloLeaderboardPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/daily" component={DailyChallengePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
