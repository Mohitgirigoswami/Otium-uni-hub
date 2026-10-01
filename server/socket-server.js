/**
 * Otium Uni Hub - Dedicated Real-time Socket.io WebSocket Server
 * Can be deployed to Render.com, Koyeb.com, Fly.io, Railway, or run locally.
 */

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
let prisma = null;
try {
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
} catch (err) {
  console.warn("⚠️  [@prisma/client not available] Running socket server in standalone JWT authentication mode.");
}
const PORT = process.env.PORT || process.env.SOCKET_PORT || 4001;
const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "otium-jwt-secret-key-campus-2026";

function computeBlindId(userId) {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "otium_blind_participant_secret_salt";
  return crypto.createHash("sha256").update(`otium_anon:${userId}:${secret}`).digest("hex");
}

const server = http.createServer((req, res) => {
  // Simple health check route
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "Otium Uni Hub Real-Time Socket Server",
        timestamp: new Date().toISOString(),
        activeSockets: io ? io.engine.clientsCount : 0,
      })
    );
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// 1. Connection Handshake Authentication Middleware
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    return next(new Error("Unauthorized: Missing authentication token."));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || (!decoded.userId && !decoded.sub && !decoded.id)) {
      return next(new Error("Unauthorized: Invalid token payload."));
    }
    socket.user = {
      userId: decoded.userId || decoded.sub || decoded.id,
      role: decoded.role || "STUDENT",
    };
    next();
  } catch (err) {
    return next(new Error("Unauthorized: Token verification failed."));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user?.userId;
  console.log(`[Socket Connected] ID: ${socket.id}, User: ${userId}`);

  // 2. Authorized Room Join
  socket.on("join_conversation", async (data) => {
    if (!data || !data.conversationId) return;
    try {
      let isAuthorized = !prisma || socket.user?.role === "SUPER_ADMIN";

      if (prisma && !isAuthorized) {
        const conversation = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
          select: {
            id: true,
            participantOneId: true,
            participantTwoId: true,
            anonParticipantOneId: true,
            anonParticipantTwoId: true,
            isAnonymousChat: true,
          },
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found." });
          return;
        }

        if (conversation.isAnonymousChat) {
          const userBlindId = computeBlindId(userId);
          isAuthorized =
            conversation.anonParticipantOneId === userBlindId ||
            conversation.anonParticipantTwoId === userBlindId;
        } else {
          isAuthorized =
            conversation.participantOneId === userId ||
            conversation.participantTwoId === userId;
        }
      }

      if (!isAuthorized) {
        console.warn(
          `[Socket Unauthorized Room Join] User ${userId} attempted to join ${data.conversationId}`
        );
        socket.emit("error", { message: "Forbidden: Not a participant in this conversation." });
        return;
      }

      const room = `conversation_${data.conversationId}`;
      socket.join(room);
      console.log(`[Socket ${socket.id}] User ${userId} joined room: ${room}`);
    } catch (err) {
      console.error("[join_conversation Error]:", err);
    }
  });

  // 3. Leave conversation room
  socket.on("leave_conversation", (data) => {
    if (!data || !data.conversationId) return;
    const room = `conversation_${data.conversationId}`;
    socket.leave(room);
    console.log(`[Socket ${socket.id}] Left room: ${room}`);
  });

  // 4. Send Message (Enforce Room Membership)
  socket.on("send_message", (messageData) => {
    if (!messageData || !messageData.conversationId) return;
    const room = `conversation_${messageData.conversationId}`;
    if (!socket.rooms.has(room)) {
      socket.emit("error", {
        message: "Forbidden: You must join the room before sending messages.",
      });
      return;
    }
    console.log(`[Message Dispatched in ${room}]:`, messageData.id || "new");

    // Broadcast to everyone in room EXCEPT sender
    socket.to(room).emit("receive_message", messageData);
  });

  // 5. Typing Indicators (Enforce Room Membership)
  socket.on("typing_start", (data) => {
    if (!data || !data.conversationId) return;
    const room = `conversation_${data.conversationId}`;
    if (!socket.rooms.has(room)) return;
    socket.to(room).emit("user_typing", {
      conversationId: data.conversationId,
      username: data.username || "Someone",
    });
  });

  socket.on("typing_stop", (data) => {
    if (!data || !data.conversationId) return;
    const room = `conversation_${data.conversationId}`;
    if (!socket.rooms.has(room)) return;
    socket.to(room).emit("user_stop_typing", {
      conversationId: data.conversationId,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket Disconnected] ID: ${socket.id}, reason: ${reason}`);
  });
});

server.listen(PORT, () => {
  console.log(`⚡ Otium Real-time Socket Server running on port ${PORT}`);
});
