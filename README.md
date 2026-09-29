# kheSports - Motion Controlled Web Sports Gaming

> **Any screen is the console. Any phone is the controller. Tennis and Pong with real swings.**

kheSports is a browser-based, motion-controlled sports gaming platform. Players connect their smartphones as physical motion controllers via a 6-digit room code or QR scan, and swing their phones in real life to play Tennis and Pong on any screen (desktop monitor, TV, or laptop).

---

## 🚀 Features

- **Full Motion Tracking**: Uses real-time accelerometer and gyroscope data from mobile web browsers (`DeviceMotionEvent` / `DeviceOrientationEvent`) to detect swings, serves, smashes, slices, and swing velocity.
- **Ultra-low Latency Peer-to-Peer Networking**: WebRTC data channels (`ordered: false, maxRetransmits: 0`) ensure instant swing-to-screen reaction times with STUN fallback.
- **Serverless Signaling**: Lightweight HTTP polling signaling protocol (`/api/room/[code]`) designed for zero-maintenance Vercel Serverless Functions.
- **3D Graphics & Animation**: Built with Three.js, GLTF characters, dynamic skeletal animations, court physics, and PBR environment skyboxes.
- **Rich Audio Experience**: Web Audio API sound engine with crowd ambiance, spatial audio, sound effects, character voice lines, and commentary.
- **Progressive Web App (PWA)**: Installable on iOS and Android devices as a native full-screen controller.

---

## 📦 Project Structure

```text
├── api/
│   └── room/
│       └── [code].js       # Vercel Serverless Function handling WebRTC signaling
├── public/                 # Static assets & client application
│   ├── index.html          # Main HTML entry point
│   ├── manifest.webmanifest# PWA manifest
│   ├── sw.js               # Service worker for offline caching
│   ├── assets/             # Bundled application JS & CSS
│   ├── audio/              # SFX, commentary, crew voice lines, and music
│   ├── models/             # 3D character models (GLTF/GLB) & textures
│   ├── sky/                # High-dynamic-range (HDR) skybox environments
│   ├── crew/               # Avatar textures & character selection sprites
│   └── fonts/              # Typography
├── server.js               # Standalone Node.js server (zero dependencies)
├── vercel.json             # Vercel routing & SPA rewrite configuration
└── package.json
```

---

## 💻 Running Locally

You only need **Node.js (v18+)** installed. There are zero external dependencies to install!

```bash
# Start the local server
npm start
```

Or directly:

```bash
node server.js
```

1. Open `http://localhost:3000` on your desktop/laptop (this acts as the game screen / host).
2. Scan the on-screen QR code or open `http://<your-network-ip>:3000/m/XXXXXX` on your mobile phone on the same Wi-Fi.
3. Calibrate your swing and play!

---

## ☁️ Deploying to Vercel

### Method 1: Push to GitHub & Connect to Vercel (Recommended)
1. Push this repository to your GitHub:
   ```bash
   git add .
   git commit -m "Initial commit of complete kheSports platform"
   git push -u origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the `LordGrimsun/Sports-Game` repository.
4. Keep the default settings (Framework preset: `Other`, Root Directory: `./`).
5. Click **Deploy**. Vercel will automatically serve static files and wire up the `/api/room/[code]` serverless function!

### Method 2: Vercel CLI
```bash
npx vercel
```
Follow the on-screen prompts to deploy directly.
