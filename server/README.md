# Email Notification WebSocket Server

A WebSocket server that handles real-time email notifications from Gmail and Outlook webhooks.

## Features

- 🔌 WebSocket server for real-time communication
- 📧 Gmail webhook endpoint with comprehensive validation
- 📧 Outlook webhook endpoint with comprehensive validation
- 🔐 Advanced security features:
  - HMAC signature validation for webhook authenticity
  - JWT token verification for Gmail Pub/Sub notifications
  - Input sanitization and format validation
  - Email address format validation
  - Resource type and change type validation
- 💚 Health check endpoint
- 📊 Connection management and monitoring
- 🧪 Comprehensive test suite for validation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp env.example .env
```

3. Configure your environment variables in `.env`

4. Start the development server:
```bash
npm run dev
```

Or build and start production:
```bash
npm run build
npm start
```

## API Endpoints

### WebSocket
- **URL**: `wss://hooks.futurixai.com`
- **Purpose**: Real-time communication with the Electron app

### Webhooks
- **Gmail**: `POST /webhook/gmail`
- **Outlook**: `POST /webhook/outlook`

### Health Check
- **URL**: `GET /health`
- **Response**: Server status and connection count

## Webhook Validation

### Gmail Webhook Validation
- **Required Fields**: `historyId` (string), `emailAddress` (valid email format)
- **JWT Token**: Validates Bearer tokens in Authorization header (if present)
- **HMAC Signature**: Validates `X-Hub-Signature-256` header (if secret configured)
- **Format Validation**: Ensures historyId is numeric string

### Outlook Webhook Validation
- **Required Structure**: `value` array with notification objects
- **Change Types**: Validates against `['created', 'updated', 'deleted']`
- **Resource Types**: Validates against `['me/messages', 'me/events', 'me/contacts']`
- **HMAC Signature**: Validates `X-Hub-Signature-256` header (if secret configured)
- **Resource ID**: Validates format of resourceId field

### Environment Variables for Validation
```bash
# Webhook signature secrets (optional but recommended for production)
GMAIL_WEBHOOK_SECRET=your_gmail_webhook_secret_here
OUTLOOK_WEBHOOK_SECRET=your_outlook_webhook_secret_here

# Google Cloud Project ID (for JWT validation)
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
```

## WebSocket Message Format

### Client to Server

#### Register for notifications
```json
{
  "type": "register",
  "userId": "user123",
  "userEmail": "user@example.com"
}
```

#### Ping
```json
{
  "type": "ping"
}
```

### Server to Client

#### New email notification
```json
{
  "type": "new_email",
  "provider": "gmail|outlook",
  "userEmail": "user@example.com",
  "historyId": "12345",
  "timestamp": "2023-10-04T20:30:00.000Z",
  "message": "New email received"
}
```

#### Registration confirmation
```json
{
  "type": "registered",
  "message": "Successfully registered for notifications",
  "userEmail": "user@example.com"
}
```

#### Pong response
```json
{
  "type": "pong",
  "timestamp": 1696444200000
}
```

## Production Deployment

For production deployment, you'll need to:

1. Set up a publicly accessible domain
2. Configure SSL/TLS certificates
3. Set up proper webhook signature validation
4. Configure Google Cloud Pub/Sub for Gmail notifications
5. Set up Microsoft Graph webhook subscriptions for Outlook

## Testing

### Basic Webhook Testing
Run the basic test script to verify webhook endpoints:
```bash
node test-webhook.js
```

### Validation Testing
Run the comprehensive validation test suite:
```bash
node test-validation.js
```

This test suite includes:
- Valid webhook payloads
- Invalid payloads (missing fields, wrong formats)
- Signature validation tests
- JWT token validation tests
- Error handling verification

## Environment Variables

- `PORT`: Server port (default: 3001)
- `GMAIL_WEBHOOK_SECRET`: Secret for Gmail webhook validation
- `OUTLOOK_WEBHOOK_SECRET`: Secret for Outlook webhook validation
- `GOOGLE_CLOUD_PROJECT_ID`: Google Cloud project ID
- `GOOGLE_CLOUD_TOPIC_NAME`: Pub/Sub topic name for Gmail notifications
- `CORS_ORIGIN`: CORS origin for web requests
