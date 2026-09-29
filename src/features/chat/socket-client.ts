import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

let activeRoomId: string | null = null;

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:4001"
    : "https://otium-sockets.onrender.com");

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
    });

    socket.on("connect", () => {
      if (activeRoomId) {
        socket?.emit("join_conversation", { conversationId: activeRoomId });
      }
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export function joinSocketConversation(conversationId: string) {
  activeRoomId = conversationId;
  const s = connectSocket();
  if (s.connected) {
    s.emit("join_conversation", { conversationId });
  }
}

export function leaveSocketConversation(conversationId: string) {
  if (activeRoomId === conversationId) {
    activeRoomId = null;
  }
  if (socket && socket.connected) {
    socket.emit("leave_conversation", { conversationId });
  }
}

export function broadcastSocketMessage(messageData: any) {
  const s = connectSocket();
  s.emit("send_message", messageData);
}

export function emitSocketTyping(conversationId: string, username: string) {
  const s = connectSocket();
  s.emit("typing_start", { conversationId, username });
}

export function emitSocketStopTyping(conversationId: string) {
  const s = connectSocket();
  s.emit("typing_stop", { conversationId });
}

export function onSocketMessage(callback: (msg: any) => void) {
  const s = connectSocket();
  s.on("receive_message", callback);
  return () => {
    s.off("receive_message", callback);
  };
}
