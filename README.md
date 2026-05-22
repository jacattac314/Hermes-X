# Local Hermes (Ollama + Qwen3) with OpenAI Fallback - Client & Simulator

This is a premium, state-of-the-art Single Page Web Application designed to act as both a **fully-functional client** and an **interactive simulator** for running a local Large Language Model (like Nous Research Hermes / Qwen3 running via Ollama) with an automatic failover to the OpenAI API when the local service fails, lags, or encounters errors.

The application features a sleek obsidian dark-mode interface with **glassmorphic panels**, **dynamic HUD metric cards**, **real-time SVG performance charts**, and an **interactive step-by-step setup guide** for configuring your local stack.

---

## Key Features

1. **Intelligent Request Routing:** Attempts to resolve prompts locally using your local Ollama server node. Seamlessly routes to OpenAI if the local node fails or exceeds the configured timeout threshold.
2. **Dual Operational Modes:**
   - **Simulation Mode (Default):** A fully sandboxed simulation playground that runs out-of-the-box with context-aware mock LLM responses. **No API keys or installations required!**
   - **Live Connection:** Integrates directly with client-side fetches to your running local Ollama server instance and the OpenAI API.
3. **Failover Simulator Control Center:** Manually trigger connection events to see how the system handles offline statuses, validation/syntax formatting failures, or latency spikes.
4. **Interactive Setup Dashboard:** Features a dedicated, glassmorphic tab containing a 6-step local-only environment installation checklist with copy-to-clipboard terminal boxes, persistent progress tracker, and a local deployment topology tree.
5. **Real-time Analytics HUD:** Displays live metrics for response latencies (visualized on a programmatically scaled SVG line graph), success/fallback counters, and a cost efficiency dashboard demonstrating accumulated dollar savings.
6. **Secure Configuration Modal:** Safely stores API keys and endpoint settings in your browser's local `localStorage`. Your OpenAI API key never leaves your browser and is only sent directly to `api.openai.com`.

---

## Quick Start Guide

### Step 1: Launch the Application
Since this is a lightweight, high-performance vanilla HTML5/CSS3/JS application, you don't need to build or run a heavy compiler:

1. **Option A (Instant):** Simply double-click [index.html](index.html) to open it directly in Google Chrome, Safari, or Microsoft Edge.
2. **Option B (Server):** Run a lightweight local HTTP server from your workspace directory:
   ```bash
   python3 -m http.server 8000
   ```
   Then navigate to `http://localhost:8000` in your web browser.

### Step 2: Try Simulation Mode (Out-of-the-Box)
The application starts in **Simulation Mode** by default. 
1. Type a message in the chat input (e.g., *"Write a Python script"*) and click send. You will see **Hermes** respond in under 1 second.
2. Toggle the **"Simulate Offline"** switch in the Simulator panel.
3. Send another message. The chat window will immediately log a connection warning and seamlessly fall back to **OpenAI**, completing your request in real time.
4. Adjust the **"Inject Local Latency Spike"** slider past 5,000ms. Send a message and watch the local client abort due to the timeout rule and immediately route to the fallback provider.

---

## Connecting a Live Backend (Live Mode)

To transition from the simulated sandbox to live execution:

### 1. Launch Ollama Locally
Browser applications can fetch Ollama's local port (`http://127.0.0.1:11434`) easily as Ollama automatically supports CORS origins for standard local browser endpoints.

1. Ensure the background daemon is serving:
   ```bash
   ollama serve
   ```
2. Pull the recommended high-fidelity reasoning model:
   ```bash
   ollama pull qwen3:32b
   ```

### 2. Enter Configurations in Settings
1. Click the **⚙️ Gear Icon** in the top right of the application header to open the Endpoint Configurations modal.
2. Enter your **OpenAI API Key** (`sk-proj-...`) for fallback capabilities.
3. Set your local URL: `http://127.0.0.1:11434/v1` (the standard OpenAI-compatible local server path for Ollama).
4. Identify your Local Model Name: `qwen3:32b` (or `qwen3:14b` for lower-resource Macs).
5. Set your preferred **Local Timeout Threshold** (e.g., `5` seconds).
6. Click **Save Configurations**.

### 3. Activate Live Mode
Click the **"Live Connection"** button in the header. The app will now start routing prompts directly to your local Ollama endpoint and automatically fail over to OpenAI utilizing standard network abort controls if your local server goes down or lags!

---

## Technical Routing Architecture

The client implements robust resilient client-side routing logic:

```mermaid
graph TD
  A[User Prompt Submitted] --> B{Is Simulation Mode?}
  B -- Yes --> C[Run Sandbox Mock Engine]
  B -- No --> D[Initiate Local Fetch request]
  D --> E{Timeout or Connection error?}
  E -- Yes (AbortController) --> F[Add Visual Thread Alert]
  E -- No --> G{Simulate JSON Format Error?}
  G -- Yes --> F
  G -- No --> H[Render Response as Hermes Qwen3]
  F --> I[Initiate OpenAI Fetch Call]
  I --> J[Render Response as OpenAI Fallback]
  J --> K[Calculate Costs & Plot SVG Latency Graph]
  H --> K
```

- **AbortController API:** Handles custom connection timeout thresholds on live network fetches.
- **Local Storage Sandbox:** Ensures api configurations remain highly secure on client-side sandboxes.
- **Dynamic HUD Math:** Automatically keeps track of pricing parameters to display accurate accumulated savings dynamically.
