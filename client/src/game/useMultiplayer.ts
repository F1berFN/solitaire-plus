import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { RoomState } from "@shared/gameTypes";

export type MultiplayerStatus = "idle" | "connecting" | "waiting" | "playing" | "finished" | "error";

export interface UseMultiplayerReturn {
  status: MultiplayerStatus;
  roomState: RoomState | null;
  error: string | null;
  joinRoom: (code: string, userId: number, userName: string) => void;
  setReady: (code: string) => void;
  sendMove: (code: string, progress: number, score: number) => void;
  sendComplete: (code: string, score: number, won: boolean) => void;
  leaveRoom: (code: string) => void;
  disconnect: () => void;
}

export function useMultiplayer(): UseMultiplayerReturn {
  const [status, setStatus] = useState<MultiplayerStatus>("idle");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const getSocket = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(window.location.origin, {
        path: "/api/socket.io",
        transports: ["websocket", "polling"],
      });

      socketRef.current.on("connect", () => {
        setStatus("connecting");
        setError(null);
      });

      socketRef.current.on("room:updated", (state: RoomState) => {
        setRoomState(state);
        setStatus(state.status === "playing" ? "playing" : "waiting");
      });

      socketRef.current.on("game:started", (state: RoomState) => {
        setRoomState(state);
        setStatus("playing");
      });

      socketRef.current.on("opponent:move", (progress: number, score: number) => {
        setRoomState((prev) => {
          if (!prev) return prev;
          // Determine if we're host or guest based on current state
          return prev;
        });
      });

      socketRef.current.on("opponent:won", (opponentScore: number) => {
        setStatus("finished");
      });

      socketRef.current.on("opponent:disconnected", () => {
        setError("Opponent disconnected");
        setStatus("error");
      });

      socketRef.current.on("error", (msg: string) => {
        setError(msg);
        setStatus("error");
      });

      socketRef.current.on("disconnect", () => {
        if (status !== "finished") setStatus("idle");
      });
    }
    return socketRef.current;
  }, []);

  const joinRoom = useCallback((code: string, userId: number, userName: string) => {
    const socket = getSocket();
    setStatus("connecting");
    socket.emit("room:join", code, userId, userName);
  }, [getSocket]);

  const setReady = useCallback((code: string) => {
    socketRef.current?.emit("room:ready", code);
  }, []);

  const sendMove = useCallback((code: string, progress: number, score: number) => {
    socketRef.current?.emit("game:move", code, progress, score);
  }, []);

  const sendComplete = useCallback((code: string, score: number, won: boolean) => {
    socketRef.current?.emit("game:complete", code, score, won);
    setStatus("finished");
  }, []);

  const leaveRoom = useCallback((code: string) => {
    socketRef.current?.emit("room:leave", code);
    setStatus("idle");
    setRoomState(null);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus("idle");
    setRoomState(null);
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return { status, roomState, error, joinRoom, setReady, sendMove, sendComplete, leaveRoom, disconnect };
}
