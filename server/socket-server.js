/**
 * Otium Uni Hub - Dedicated Real-time Socket.io WebSocket Server
 * Can be deployed to Render.com, Koyeb.com, Fly.io, Railway, or run locally.
 */

const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || process.env.SOCKET_PORT || 4001;

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
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // 1. Join conversation room
  socket.on("join_conversation", (data) => {
    if (!data || !data.conversationId) return;
    const room = `conversation_${data.conversationId}`;
    socket.join(room);
    console.log(`[Socket ${socket.id}] Joined room: ${room}`);
  });

  // 2. Leave conversation room
  socket.on("leave_conversation", (data) => {
    if (!data || !data.conversationId) return;
    const room = `conversation_${data.conversationId}`;
    socket.leave(room);
    console.log(`[Socket ${socket.id}] Left room: ${room}`);
  });

  // 3. Real-time message dispatch
  socket.on("send_message", (messageData) => {
    if (!messageData || !messageData.conversationId) return;
    const room = `conversation_${messageData.conversationId}`;
    console.log(`[Message Dispatched in ${room}]:`, messageData.id || "new");
    
    // Broadcast to everyone in room EXCEPT sender
    socket.to(room).emit("receive_message", messageData);
  });

  // 4. Typing indicators
  socket.on("typing_start", (data) => {
    if (!data || !data.conversationId) return;
    const room = `conversation_${data.conversationId}`;
    socket.to(room).emit("user_typing", {
      conversationId: data.conversationId,
      username: data.username || "Someone",
    });
  });

  socket.on("typing_stop", (data) => {
    if (!data || !data.conversationId) return;
    const room = `conversation_${data.conversationId}`;
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
