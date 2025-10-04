import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import { WebhookHandler } from "./webhook-handler.js";
import { WebSocketManager } from "./websocket-manager";

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize managers
const webSocketManager = new WebSocketManager(wss);
const webhookHandler = new WebhookHandler(webSocketManager);

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");

  // Add connection to manager
  webSocketManager.addConnection(ws);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      webSocketManager.handleMessage(ws, data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        }),
      );
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    webSocketManager.removeConnection(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    webSocketManager.removeConnection(ws);
  });
});

// Webhook endpoints
app.post("/webhook/gmail", (req, res) => {
  webhookHandler.handleGmailWebhook(req, res);
});

app.post("/webhook/outlook", (req, res) => {
  webhookHandler.handleOutlookWebhook(req, res);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    connections: webSocketManager.getConnectionCount(),
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Email notification server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🔗 Webhook endpoints:`);
  console.log(`   - Gmail: http://localhost:${PORT}/webhook/gmail`);
  console.log(`   - Outlook: http://localhost:${PORT}/webhook/outlook`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
