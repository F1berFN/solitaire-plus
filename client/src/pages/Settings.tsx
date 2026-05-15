import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGuestSession } from "@/hooks/useGuestSession";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, User, Settings as SettingsIcon, Trophy, Palette, LogOut, Mail,
  Calendar, Zap, Volume2, Bell, Trash2, Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getEloTier, getEloTierColor } from "@shared/elo";

const GAME_THEMES = [
  { id: "classic", name: "Classic Green", color: "bg-green-600" },
  { id: "dark-neon", name: "Dark Neon", color: "bg-purple-600" },
  { id: "space", name: "Space", color: "bg-blue-900" },
  { id: "nature", name: "Nature", color: "bg-emerald-700" },
  { id: "retro-pixel", name: "Retro Pixel", color: "bg-yellow-600" },
];

const CARD_BACKS = [
  { id: "default", name: "Classic" },
  { id: "geometric", name: "Geometric" },
  { id: "ornate", name: "Ornate" },
  { id: "minimal", name: "Minimal" },
  { id: "gradient", name: "Gradient" },
];

type SettingsTab = "account" | "stats" | "game" | "web" | "prefs";

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { user, logout, loading: authLoading } = useAuth();
  const { session: guestSession } = useGuestSession();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [displayName, setDisplayName] = useState("");
  const [selectedGameTheme, setSelectedGameTheme] = useState("classic");
  const [selectedCardBack, setSelectedCardBack] = useState("default");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [websiteTheme, setWebsiteTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch user stats
  const { data: userStats } = trpc.user.getStats.useQuery(undefined, {
    enabled: !!user,
  });

  // Delete account mutation
  const deleteAccountMutation = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted successfully");
      setTimeout(() => {
        logout();
        navigate("/");
      }, 1000);
    },
    onError: (error) => {
      toast.error("Failed to delete account: " + error.message);
      setDeleteLoading(false);
    },
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || "");
    }
    // Load all preferences from localStorage
    const savedGameTheme = localStorage.getItem("theme") || "classic";
    const savedCardBack = localStorage.getItem("cardBack") || "default";
    const savedWebsiteTheme = (localStorage.getItem("websiteTheme") || "auto") as 'light' | 'dark' | 'auto';
    const savedSound = localStorage.getItem("soundEnabled") !== "false";
    const savedNotifications = localStorage.getItem("notificationsEnabled") !== "false";
    setSelectedGameTheme(savedGameTheme);
    setSelectedCardBack(savedCardBack);
    setWebsiteTheme(savedWebsiteTheme);
    setSoundEnabled(savedSound);
    setNotificationsEnabled(savedNotifications);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    await deleteAccountMutation.mutateAsync();
  };

  const handleSavePreferences = () => {
    localStorage.setItem("theme", selectedGameTheme);
    localStorage.setItem("cardBack", selectedCardBack);
    localStorage.setItem("soundEnabled", String(soundEnabled));
    localStorage.setItem("notificationsEnabled", String(notificationsEnabled));
    localStorage.setItem("websiteTheme", websiteTheme);
    toast.success("Preferences saved!");
  };

  const isGuest = !user && !!guestSession;
  const playerName = user?.name?.split(" ")[0] || guestSession?.fullName || "Guest";
  const playerEmail = user?.email || "guest@solitaire.local";
  const elo = userStats?.elo || 1200;
  const tier = getEloTier(elo);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const navButtons: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "account", label: "Account", icon: <User className="w-4 h-4" /> },
    { id: "stats", label: "Stats", icon: <Trophy className="w-4 h-4" /> },
    { id: "game", label: "Game", icon: <Palette className="w-4 h-4" /> },
    { id: "web", label: "Web", icon: <Monitor className="w-4 h-4" /> },
    { id: "prefs", label: "Prefs", icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="w-8 h-8" />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {navButtons.map((btn) => (
            <Button
              key={btn.id}
              variant={activeTab === btn.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(btn.id)}
              className="gap-2 whitespace-nowrap"
            >
              {btn.icon}
              <span className="hidden sm:inline">{btn.label}</span>
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Account Tab */}
          {activeTab === "account" && (
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details and profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    disabled={isGuest}
                  />
                  {isGuest && <p className="text-xs text-muted-foreground">Guests can change name in the game</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <div className="p-3 bg-muted rounded-lg text-sm">{playerEmail}</div>
                </div>

                {/* Joined Date */}
                {user && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Joined
                    </Label>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Logout & Delete */}
                {user && (
                  <div className="space-y-3 mt-6">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </Button>
                  </div>
                )}

                {/* Delete Confirmation Dialog */}
                {showDeleteConfirm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-sm w-full">
                      <CardHeader>
                        <CardTitle className="text-destructive">Delete Account?</CardTitle>
                        <CardDescription>
                          This action cannot be undone. All your data will be permanently deleted.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Are you absolutely sure you want to delete your account? This will:
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                          <li>Delete all your game history</li>
                          <li>Remove your ELO rating</li>
                          <li>Delete your achievements</li>
                          <li>Cannot be recovered</li>
                        </ul>
                        <div className="flex gap-3 pt-4">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={deleteLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && (
            <Card>
              <CardHeader>
                <CardTitle>Your Statistics</CardTitle>
                <CardDescription>Games played, ratings, and achievements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ELO Rating */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    ELO Rating
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "text-4xl font-bold bg-gradient-to-r",
                      getEloTierColor(elo),
                      "bg-clip-text text-transparent"
                    )}>
                      {elo}
                    </div>
                    <Badge className="text-lg px-3 py-1">{tier}</Badge>
                  </div>
                </div>

                {/* Games Stats */}
                {userStats && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Games Played</p>
                      <p className="text-2xl font-bold">{userStats.gamesPlayed}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                      <p className="text-2xl font-bold">
                        {userStats.gamesPlayed > 0
                          ? Math.round((userStats.gamesWon / userStats.gamesPlayed) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Best Score</p>
                      <p className="text-2xl font-bold">{userStats.bestScore}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Best Streak</p>
                      <p className="text-2xl font-bold">{userStats.bestStreak}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Game Tab */}
          {activeTab === "game" && (
            <Card>
              <CardHeader>
                <CardTitle>Game Appearance</CardTitle>
                <CardDescription>Customize how the game looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Game Theme Selector */}
                <div className="space-y-3">
                  <Label>Game Theme</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {GAME_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedGameTheme(theme.id)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all",
                          selectedGameTheme === theme.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn("w-full h-8 rounded mb-2", theme.color)} />
                        <p className="text-xs font-medium">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Back Selector */}
                <div className="space-y-3">
                  <Label>Card Back Design</Label>
                  <Select value={selectedCardBack} onValueChange={setSelectedCardBack}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_BACKS.map((back) => (
                        <SelectItem key={back.id} value={back.id}>
                          {back.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Web Tab */}
          {activeTab === "web" && (
            <Card>
              <CardHeader>
                <CardTitle>Website Theme</CardTitle>
                <CardDescription>Choose how the website looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Theme Preference</Label>
                  <Select value={websiteTheme} onValueChange={(val) => setWebsiteTheme(val as 'light' | 'dark' | 'auto')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {websiteTheme === 'auto' && 'Uses your system preference'}
                    {websiteTheme === 'light' && 'Always use light theme'}
                    {websiteTheme === 'dark' && 'Always use dark theme'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preferences Tab */}
          {activeTab === "prefs" && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Game settings and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sound Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Volume2 className="w-4 h-4" />
                    Sound Effects
                  </Label>
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>

                {/* Notifications Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </Label>
                  <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                </div>

                {/* Save Button */}
                <Button className="w-full mt-6" onClick={handleSavePreferences}>
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
