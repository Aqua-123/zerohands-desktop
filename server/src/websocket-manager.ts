import { WebSocket, WebSocketServer } from "ws";

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  userEmail?: string;
  connectedAt: Date;
}

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface RegisterMessage extends WebSocketMessage {
  type: "register";
  userId: string;
  userEmail: string;
}

interface NotificationMessage {
  type: string;
  provider?: string;
  userEmail?: string;
  historyId?: string;
  resourceId?: string;
  timestamp?: string;
  message?: string;
  [key: string]: unknown;
}

interface ConnectionInfo {
  userEmail?: string;
  userId?: string;
  connectedAt: Date;
  isAlive: boolean;
}

export class WebSocketManager {
  private connections: Map<WebSocket, ClientConnection> = new Map();
  private userConnections: Map<string, WebSocket> = new Map(); // userEmail -> WebSocket

  constructor(private wss: WebSocketServer) {}

  addConnection(ws: WebSocket): void {
    const connection: ClientConnection = {
      ws,
      connectedAt: new Date(),
    };
    this.connections.set(ws, connection);
    console.log(
      `New connection added. Total connections: ${this.connections.size}`,
    );
  }

  removeConnection(ws: WebSocket): void {
    const connection = this.connections.get(ws);
    if (connection) {
      if (connection.userEmail) {
        this.userConnections.delete(connection.userEmail);
      }
      this.connections.delete(ws);
      console.log(
        `Connection removed. Total connections: ${this.connections.size}`,
      );
    }
  }

  handleMessage(ws: WebSocket, data: WebSocketMessage): void {
    const connection = this.connections.get(ws);
    if (!connection) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Connection not found",
        }),
      );
      return;
    }

    switch (data.type) {
      case "register":
        this.handleRegister(ws, data as RegisterMessage);
        break;
      case "ping":
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        break;
      default:
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Unknown message type: ${data.type}`,
          }),
        );
    }
  }

  private handleRegister(ws: WebSocket, data: RegisterMessage): void {
    const { userId, userEmail } = data;

    if (!userId || !userEmail) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "userId and userEmail are required for registration",
        }),
      );
      return;
    }

    const connection = this.connections.get(ws);
    if (connection) {
      connection.userId = userId;
      connection.userEmail = userEmail;
      this.userConnections.set(userEmail, ws);

      console.log(`User registered: ${userEmail} (${userId})`);

      ws.send(
        JSON.stringify({
          type: "registered",
          message: "Successfully registered for notifications",
          userEmail,
        }),
      );
    }
  }

  sendToUser(userEmail: string, message: NotificationMessage): boolean {
    const ws = this.userConnections.get(userEmail);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Error sending message to ${userEmail}:`, error);
        this.removeConnection(ws);
        return false;
      }
    }
    return false;
  }

  broadcast(message: NotificationMessage): void {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((connection, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error("Error broadcasting message:", error);
          this.removeConnection(ws);
        }
      }
    });
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getRegisteredUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  getConnectionInfo(): ConnectionInfo[] {
    return Array.from(this.connections.values()).map((conn) => ({
      userEmail: conn.userEmail,
      userId: conn.userId,
      connectedAt: conn.connectedAt,
      isAlive: conn.ws.readyState === WebSocket.OPEN,
    }));
  }
}
