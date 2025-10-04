import { EventEmitter } from "events";

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface NewEmailNotification {
  type: "new_email";
  provider: "gmail" | "outlook";
  userEmail: string;
  historyId?: string;
  resourceId?: string;
  timestamp: string;
  message: string;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second
  private isConnecting = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private serverUrl: string;

  constructor(serverUrl: string = "ws://localhost:3001") {
    super();
    this.serverUrl = serverUrl;
  }

  connect(userId: string, userEmail: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        reject(new Error("Connection already in progress"));
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log("🔌 WebSocket connected to notification server");
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Register for notifications
          this.send({
            type: "register",
            userId,
            userEmail,
          });

          // Start ping interval
          this.startPingInterval();

          this.emit("connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          console.log(
            "🔌 WebSocket connection closed:",
            event.code,
            event.reason,
          );
          this.isConnecting = false;
          this.stopPingInterval();
          this.emit("disconnected", event);

          // Attempt to reconnect if not a manual close
          if (
            event.code !== 1000 &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.attemptReconnect(userId, userEmail);
          }
        };

        this.ws.onerror = (error) => {
          console.error("🔌 WebSocket error:", error);
          this.isConnecting = false;
          this.emit("error", error);
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }
    this.stopPingInterval();
  }

  private attemptReconnect(userId: string, userEmail: string): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect(userId, userEmail).catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }

  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message:", message);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "registered":
        console.log(
          "✅ Registered for email notifications:",
          message.userEmail,
        );
        this.emit("registered", message);
        break;

      case "new_email":
        console.log("📧 New email notification received:", message);
        this.emit("newEmail", message as unknown as NewEmailNotification);
        break;

      case "pong":
        // Handle pong response
        break;

      case "error":
        console.error("WebSocket server error:", message.message);
        this.emit("serverError", message);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return "CLOSED";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "UNKNOWN";
    }
  }
}
