import { Button } from "@/components/ui/button";
import { Heart, Github, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-16">
      <div className="container py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🃏</span>
              <span className="font-serif font-bold text-lg">Solitaire<span className="text-primary">+</span></span>
            </div>
            <p className="text-sm text-muted-foreground">
              The ultimate Klondike solitaire experience with AI, multiplayer, and more.
            </p>
          </div>

          {/* Game Modes */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Game Modes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/" className="hover:text-foreground transition">Solo Play</a></li>
              <li><a href="/" className="hover:text-foreground transition">vs AI</a></li>
              <li><a href="/" className="hover:text-foreground transition">Multiplayer</a></li>
              <li><a href="/" className="hover:text-foreground transition">Daily Challenge</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/" className="hover:text-foreground transition">Leaderboard</a></li>
              <li><a href="/" className="hover:text-foreground transition">ELO Rankings</a></li>
              <li><a href="/" className="hover:text-foreground transition">Achievements</a></li>
              <li><a href="/" className="hover:text-foreground transition">Profiles</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Connect</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Github className="w-4 h-4" />
                <span className="text-xs">GitHub</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Mail className="w-4 h-4" />
                <span className="text-xs">Email</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© 2026 Solitaire+. All rights reserved.</p>
          <div className="flex items-center gap-1 mt-4 sm:mt-0">
            Made with <Heart className="w-3.5 h-3.5 text-red-500" /> for card game lovers
          </div>
        </div>
      </div>
    </footer>
  );
}
