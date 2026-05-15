import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getRoomByCode, updateRoom } from "./db";

interface RoomPlayer {
  userId: number;
  userName: string;
  socketId: string;
  progress: number;
  score: number;
  ready: boolean;
}

// In-memory room state for real-time sync
const roomPlayers = new Map<string, { host?: RoomPlayer; guest?: RoomPlayer }>();

export function setupSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;
    let currentUserId: number | null = null;

    socket.on("room:join", async (code: string, userId: number, userName: string) => {
      const room = await getRoomByCode(code);
      if (!room) {
        socket.emit("error", "Room not found");
        return;
      }

      currentRoom = code;
      currentUserId = userId;
      socket.join(code);

      if (!roomPlayers.has(code)) {
        roomPlayers.set(code, {});
      }
      const players = roomPlayers.get(code)!;

      if (room.hostId === userId) {
        players.host = { userId, userName, socketId: socket.id, progress: 0, score: 0, ready: false };
      } else if (!players.guest) {
        players.guest = { userId, userName, socketId: socket.id, progress: 0, score: 0, ready: false };
        // Update DB with guest
        await updateRoom(code, { guestId: userId });
      }

      // Broadcast updated room state
      const updatedRoom = await getRoomByCode(code);
      io.to(code).emit("room:updated", {
        code,
        hostId: room.hostId,
        hostName: players.host?.userName ?? "",
        guestId: players.guest?.userId,
        guestName: players.guest?.userName,
        seed: room.seed,
        drawMode: room.drawMode,
        status: updatedRoom?.status ?? "waiting",
        hostProgress: players.host?.progress ?? 0,
        guestProgress: players.guest?.progress ?? 0,
        hostScore: players.host?.score ?? 0,
        guestScore: players.guest?.score ?? 0,
      });
    });

    socket.on("room:ready", async (code: string) => {
      const players = roomPlayers.get(code);
      if (!players) return;

      if (players.host?.socketId === socket.id) players.host.ready = true;
      if (players.guest?.socketId === socket.id) players.guest.ready = true;

      // Start game when both players are ready
      if (players.host?.ready && players.guest?.ready) {
        await updateRoom(code, { status: "playing" });
        const room = await getRoomByCode(code);
        if (!room) return;
        io.to(code).emit("game:started", {
          code,
          hostId: room.hostId,
          hostName: players.host.userName,
          guestId: players.guest?.userId,
          guestName: players.guest?.userName,
          seed: room.seed,
          drawMode: room.drawMode,
          status: "playing",
          hostProgress: 0,
          guestProgress: 0,
          hostScore: 0,
          guestScore: 0,
        });
      }
    });

    socket.on("game:move", (code: string, progress: number, score: number) => {
      const players = roomPlayers.get(code);
      if (!players) return;

      if (players.host?.socketId === socket.id) {
        players.host.progress = progress;
        players.host.score = score;
        // Notify guest of host's progress
        if (players.guest) {
          io.to(players.guest.socketId).emit("opponent:move", progress, score);
        }
      } else if (players.guest?.socketId === socket.id) {
        players.guest.progress = progress;
        players.guest.score = score;
        // Notify host of guest's progress
        if (players.host) {
          io.to(players.host.socketId).emit("opponent:move", progress, score);
        }
      }
    });

    socket.on("game:complete", async (code: string, score: number, won: boolean) => {
      const players = roomPlayers.get(code);
      if (!players) return;

      const isHost = players.host?.socketId === socket.id;
      const isGuest = players.guest?.socketId === socket.id;

      if (isHost && players.host) {
        players.host.score = score;
        if (won && players.guest) {
          io.to(players.guest.socketId).emit("opponent:won", score);
          await updateRoom(code, {
            status: "finished",
            hostScore: score,
            guestScore: players.guest.score,
            hostWon: true,
            finishedAt: new Date(),
          });
        }
      } else if (isGuest && players.guest) {
        players.guest.score = score;
        if (won && players.host) {
          io.to(players.host.socketId).emit("opponent:won", score);
          await updateRoom(code, {
            status: "finished",
            hostScore: players.host.score,
            guestScore: score,
            hostWon: false,
            finishedAt: new Date(),
          });
        }
      }
    });

    socket.on("room:leave", (code: string) => {
      socket.leave(code);
      const players = roomPlayers.get(code);
      if (players) {
        if (players.host?.socketId === socket.id) {
          if (players.guest) {
            io.to(players.guest.socketId).emit("opponent:disconnected");
          }
          roomPlayers.delete(code);
        } else if (players.guest?.socketId === socket.id) {
          if (players.host) {
            io.to(players.host.socketId).emit("opponent:disconnected");
          }
          players.guest = undefined;
        }
      }
    });

    socket.on("disconnect", () => {
      if (currentRoom) {
        const players = roomPlayers.get(currentRoom);
        if (players) {
          if (players.host?.socketId === socket.id) {
            if (players.guest) {
              io.to(players.guest.socketId).emit("opponent:disconnected");
            }
            roomPlayers.delete(currentRoom);
          } else if (players.guest?.socketId === socket.id) {
            if (players.host) {
              io.to(players.host.socketId).emit("opponent:disconnected");
            }
            players.guest = undefined;
          }
        }
      }
    });
  });

  return io;
}
