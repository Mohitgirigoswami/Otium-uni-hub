import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

let activeMobileRoomId: string | null = null;

const SOCKET_SERVER_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  "https://otium-sockets.onrender.com";

export function getMobileSocket(): Socket {
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
      if (activeMobileRoomId) {
        socket?.emit("join_conversation", { conversationId: activeMobileRoomId });
      }
    });
  }
  return socket;
}

export function connectMobileSocket(): Socket {
  const s = getMobileSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectMobileSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export function joinMobileSocketConversation(conversationId: string) {
  activeMobileRoomId = conversationId;
  const s = connectMobileSocket();
  if (s.connected) {
    s.emit("join_conversation", { conversationId });
  }
}

export function leaveMobileSocketConversation(conversationId: string) {
  if (activeMobileRoomId === conversationId) {
    activeMobileRoomId = null;
  }
  if (socket && socket.connected) {
    socket.emit("leave_conversation", { conversationId });
  }
}

export function broadcastMobileSocketMessage(messageData: any) {
  const s = connectMobileSocket();
  s.emit("send_message", messageData);
}

export function emitMobileSocketTyping(conversationId: string, username: string) {
  const s = connectMobileSocket();
  s.emit("typing_start", { conversationId, username });
}

export function emitMobileSocketStopTyping(conversationId: string) {
  const s = connectMobileSocket();
  s.emit("typing_stop", { conversationId });
}

export function onMobileSocketMessage(callback: (msg: any) => void) {
  const s = connectMobileSocket();
  s.on("receive_message", callback);
  return () => {
    s.off("receive_message", callback);
  };
}

