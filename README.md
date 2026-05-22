# Local Hermes (Ollama + Qwen3) with OpenAI Fallback - Client, Proxy & Browser Controller

This is a premium, state-of-the-art Single Page Web Application and local proxy server designed to act as both a **fully-functional client** and an **interactive simulator** for running a local Large Language Model (Nous Research Hermes / Qwen3 running via Ollama) with an automatic failover to the OpenAI API when the local service fails, lags, or encounters errors.

The client features a sleek obsidian dark-mode interface with **glassmorphic panels**, **dynamic HUD metric cards**, **real-time SVG performance charts**, and an **interactive step-by-step setup guide** for configuring your local stack.

---

## 🏗️ Premium Architecture & Components

The upgraded architecture transitions from browser-only simulations to real-world host-level execution:

```
                  ┌───────────────────────────────┐
                  │      index.html / app.js      │  ◄── (Web Client Dashboard)
                  └───────────────┬───────────────┘
                                  │
                       POST /v1/chat/completions
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │    server.py (Proxy Server)   │  ◄── (Runs on port 8000)
                  └───────────────┬───────────────┘
                                  │
                        subprocess execution
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │     hermes CLI Agent          │  ◄── (Path: ~/.local/bin/hermes)
                  └───────────────┬───────────────┘
                                  │
                     AGENT_BROWSER_HEADED=true
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │    Physical headed Chrome     │  ◄── (Real-world browser automation)
                  └───────────────────────────────┘
```

1. **Proxy Gateway Server (`server.py`):** A zero-dependency Python server running on `http://127.0.0.1:8000`. It hosts the frontend web assets, intercepts `/v1/chat/completions` requests, translates prompts, and executes the local `hermes` CLI agent binary. It also exposes `/api/search` and `/api/fetch` endpoints for real-time web scraping.
2. **Headed Browser Controller:** When a web navigation prompt is submitted (e.g. *"go to news.ycombinator.com"*), the local `hermes` agent spins up a physical, headed Google Chrome window on your Mac host, interacts with the target webpage in real-time, extracts text content, feeds it back to the local model context, and gracefully exits.
3. **Native macOS App Launcher (`Local Hermes.app`):** A natively compiled AppleScript applet bundle equipped with a custom green/obsidian cybernetic helmet icon. Double-clicking it in macOS Finder instantly opens Terminal, configures the environment paths, and launches the interactive `hermes --tui` CLI session.
4. **Absolute Local Privacy Policy ("Block OpenAI"):** A prominent glassmorphic warn-red toggle panel in the dashboard. When activated, it changes the HUD status and completely blocks all outgoing commercial fallback APIs—guaranteeing 100% data privacy by forcing the router to fail locally with custom routing alert bubbles instead of hitting external servers.

---

## Key Features

- **Intelligent Request Routing:** Routes general prompts to the local Ollama node. Seamlessly switches to OpenAI fallback channels if local execution times out or returns structural JSON errors.
- **Failover Simulator Control Center:** Manually trigger connection events to see how the system handles offline statuses, validation/syntax formatting failures, or latency spikes.
- **Dual Operational Modes:**
  - **Simulation Mode (Default):** Runs a fully sandboxed mock LLM response engine out-of-the-box. **No API keys or installations required!**
  - **Live Connection:** Direct routing to the running `server.py` proxy on port `8000` to execute live Mac terminal shell commands, local model inference, and real headed Chrome browser actions.
- **Interactive Setup Dashboard:** Features a dedicated, glassmorphic tab containing a 7-step local-only environment installation checklist with copy-to-clipboard terminal boxes, persistent progress tracker, and a local deployment topology tree.
- **Real-time Analytics HUD:** Displays live metrics for response latencies (visualized on a programmatically scaled SVG line graph), success/fallback counters, and a cost efficiency dashboard demonstrating accumulated dollar savings.

---

## Quick Start Guide

### Step 1: Launch the Proxy Server
Run the local HTTP and API proxy gateway server from your workspace directory:
```bash
python3 server.py
```
The server will bind to `http://127.0.0.1:8000` and automatically serve the static web files (`index.html`, `index.css`, `app.js`).

### Step 2: Try Simulation Mode (Out-of-the-Box)
1. Open `http://127.0.0.1:8000` in Google Chrome or Safari.
2. Type a message in the chat input (e.g., *"Write a Python script"*) and click send. You will see **Hermes** respond in under 1 second.
3. Toggle the **"Simulate Offline"** switch in the Simulator panel.
4. Send another message. The chat window will immediately log a connection warning and seamlessly fall back to **OpenAI**, completing your request in real time.
5. Check the **"🔒 Block OpenAI Fallback"** toggle card. Watch the card glow warning-red, and watch the OpenAI Status HUD change to **Blocked (Policy)**. Send a message with the offline simulator active, and verify that the system completely blocks outbound API calls and outputs a local routing warning instead.

---

## Setting up Live Connections & Real Browser Control

To transition from the simulated sandbox to real-world host-level execution:

### 1. Launch Ollama Locally
1. Ensure the background daemon is serving:
   ```bash
   ollama serve
   ```
2. Pull the recommended high-fidelity reasoning model:
   ```bash
   ollama pull qwen3:32b
   ```

### 2. Configure the local CLI Configuration (`~/.hermes/config.yaml`)
To avoid standard macOS IPv6 loopback connection drops, ensure your `base_url` is mapped explicitly to the IPv4 address:
```yaml
model:
  default: google/gemma-4-26b-a4b
  provider: lmstudio
  base_url: http://127.0.0.1:1234/v1
  openai_runtime: codex_app_server
```

### 3. Enter Configurations in the Web Settings Modal
1. Click the **⚙️ Gear Icon** in the top right of the application header to open the Endpoint Configurations modal.
2. Set your local URL to: `http://127.0.0.1:8000/v1` (the local API proxy server gateway).
3. Identify your Local Model Name: `qwen3:32b` (or your active default local model ID).
4. Enter your **OpenAI API Key** (`sk-proj-...`) for fallback capabilities.
5. Set your preferred **Local Timeout Threshold** (e.g., `5` seconds).
6. Click **Save Configurations**.

### 4. Enable Live Mode & Real Browser Action
1. Click the **"Live Connection"** button in the header.
2. Submit a web navigation request in the chat box, e.g.:
   ```
   go to news.ycombinator.com and list the top story
   ```
3. Watch a physical headed Google Chrome window launch on your desktop, perform the real-world scraping operations live before your eyes, and return the Hacker News headlines directly inside your chat feed!

