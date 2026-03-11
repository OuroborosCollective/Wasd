# Arelorian / Ouroboros Project Setup & Installation Guide

Welcome to the Arelorian Browser-MMORPG project. This guide outlines the exact installation order and setup steps required to get the project running locally.

## Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)
- A **Firebase Project** (for Authentication and Firestore)

---

## Installation Order

### 1. Install Dependencies
First, install all required packages for the project. From the root directory, run:
```bash
npm install
```
*(This will install dependencies for both the client and the server based on your `package.json`.)*

### 2. Configure Environment Variables
Copy the example environment file to create your local configuration:
```bash
cp .env.example .env
```

Open the `.env` file and fill in your Firebase credentials:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**For the Server (Firebase Admin):**
- Generate a new private key from your Firebase Console (Project settings > Service accounts).
- Copy the entire JSON content and paste it as the value for `FIREBASE_SERVICE_ACCOUNT_KEY` in your `.env` file.

### 3. Build the Project
Compile the TypeScript code and build the client assets:
```bash
npm run build
```

### 4. Start the Development Server
Start the application (this will boot up the server on port 3000 and serve the client):
```bash
npm run start
```
*(If you are actively developing, you can use `npm run dev` if configured in your package.json).*

---

## Project Structure Overview
- `/client`: Frontend code (Three.js renderer, UI, WebSocket client).
- `/server`: Backend code (Game loop, WebSocket server, Firebase Admin).
- `/docs`: Architecture and design documents (e.g., `MASTER_DESIGN_BIBLE.md`).
- `/world-assets`: 3D models and GLB files.

## Next Steps
Once the server is running, you can access the game via your browser. The initial screen will prompt you to log in or sign up using the Firebase Authentication integration.

For a detailed breakdown of the development sequence, refer to `docs/BUILD_SEQUENCE_MASTER.md`.
