import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface GuestNameSelectorProps {
  open: boolean;
  onSelect: (name: string) => Promise<void>;
  isLoading?: boolean;
}

export function GuestNameSelector({ open, onSelect, isLoading = false }: GuestNameSelectorProps) {
  const [name, setName] = useState("");

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a name");
      return;
    }
    if (trimmed.length > 64) {
      toast.error("Name is too long (max 64 characters)");
      return;
    }
    try {
      await onSelect(trimmed);
    } catch (e) {
      toast.error("Failed to create guest session");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Play as Guest</DialogTitle>
          <DialogDescription>
            Enter a display name. You'll get a unique hashtag number (e.g., #0001) to keep your name separate from others.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Display Name</label>
            <Input
              placeholder="e.g., f1ber, Alice, Player..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
              maxLength={64}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              You'll appear as: <span className="font-mono font-semibold text-foreground">{name || "Name"} #{String(1).padStart(4, "0")}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setName("")}
              disabled={isLoading}
            >
              Clear
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={isLoading || !name.trim()}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Creating..." : "Play Now"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
