/**
 * Local Hermes with OpenAI Fallback Routing - Client & Simulator
 * Core JavaScript logic coordinating UI interactions, mock sandbox engine,
 * and live API integrations.
 */

class AppController {
  constructor() {
    // 1. Core Config & Default Parameters
    this.config = {
      openaiKey: localStorage.getItem('lmlink_openai_key') || '',
      localUrl: localStorage.getItem('lmlink_local_url') || 'http://127.0.0.1:11434/v1',
      localModel: localStorage.getItem('lmlink_local_model') || 'qwen3:32b',
      openaiModel: localStorage.getItem('lmlink_openai_model') || 'gpt-4o-mini',
      timeoutSeconds: parseInt(localStorage.getItem('lmlink_timeout') || '5', 10)
    };

    // 2. Operational state parameters
    this.isSimulation = true;
    this.messageHistory = [];
    this.metrics = {
      localSuccess: 0,
      openaiSuccess: 0,
      fallbackCount: 0,
      totalSavedDollars: 0.00,
      pureOpenAiCost: 0.00,
      hybridRouterCost: 0.00,
      latencyHistory: [] // Format: { local: ms, openai: ms, isFallback: bool }
    };

    // Pricing models (approximations for cost dashboard calculation)
    this.pricing = {
      'gpt-4o-mini': { flatCost: 0.002, label: 'GPT-4o-Mini' },
      'gpt-4o': { flatCost: 0.03, label: 'GPT-4o' },
      'o1-mini': { flatCost: 0.015, label: 'O1-Mini' }
    };

    // 3. Pre-canned mock responses database (for high-fidelity simulation)
    this.mockDatabase = {
      greeting: {
        local: "Hello! I am **Hermes Agent** (specifically running **Qwen3 (32B)** locally via Ollama). I'm configured to serve your local reasoning tasks and operate fully sandboxed without sending your data to external servers.",
        openai: "Greetings! I'm your **OpenAI GPT-4o-mini** fallback agent. I've taken over seamlessly since your local Hermes model is currently offline, lagging, or taking too long to reply."
      },
      code: {
        local: "Here is a quick, secure Python script to process a text file locally using Hermes. Running code locally ensures that your proprietary business logic remains fully secure:\n\n```python\ndef analyze_file(filepath):\n    with open(filepath, 'r') as file:\n        lines = file.readlines()\n    return f'Total local lines parsed: {len(lines)}'\n\nprint(analyze_file('confidential_data.csv'))\n```",
        openai: "Sure! Let me supply an optimized fallback Python implementation. Since your local Hermes service encountered a syntax validation failure, I've re-written the solution:\n\n```python\nimport pandas as pd\n\ndef analyze_file_robust(filepath):\n    # OpenAI Fallback: Adding structured pandas checking\n    df = pd.read_csv(filepath)\n    return f'Dataset rows: {df.shape[0]}, columns: {df.shape[1]}'\n\nprint(analyze_file_robust('confidential_data.csv'))\n```"
      },
      slow: {
        local: "Ah, my apologies! My reasoning engine is chewing through a complex chain-of-thought token sequence locally. This is a very computationally expensive task, which explains the high latency.",
        openai: "I'm stepping in to answer because your local model exceeded your timeout limit of 5.0 seconds. OpenAI APIs provide highly scaled infrastructure for consistent response windows."
      },
      general: {
        local: "That's an interesting inquiry! Processing this request using local Hermes allows you to run unlimited inference prompts completely free, saving you from expensive token costs.",
        openai: "Your local LLM encountered a parsing error or a connection drop. I have automatically processed your prompt to ensure that your active session is completely uninterrupted."
      }
    };

    // 4. Cache DOM queries
    this.dom = {
      btnSimulation: document.getElementById('btn-simulation'),
      btnLive: document.getElementById('btn-live'),
      btnSettings: document.getElementById('btn-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnCancelSettings: document.getElementById('btn-cancel-settings'),
      btnSaveSettings: document.getElementById('btn-save-settings'),
      modalOverlay: document.getElementById('settings-modal-overlay'),
      
      // Tabs Elements
      btnTabAnalytics: document.getElementById('btn-tab-analytics'),
      btnTabSetup: document.getElementById('btn-tab-setup'),
      contentAnalytics: document.getElementById('content-analytics'),
      contentSetup: document.getElementById('content-setup'),

      // HUD items
      valLocalName: document.getElementById('val-local-name'),
      valOpenaiName: document.getElementById('val-openai-name'),
      badgeLocalStatus: document.getElementById('badge-local-status'),
      badgeOpenaiStatus: document.getElementById('badge-openai-status'),
      valSavings: document.getElementById('val-savings'),
      badgeSavings: document.getElementById('badge-savings'),
      valFallbackRate: document.getElementById('val-fallback-rate'),
      badgeRatioDetail: document.getElementById('badge-ratio-detail'),
      
      // Form elements & inputs
      chatHistory: document.getElementById('chat-history'),
      chatForm: document.getElementById('chat-form'),
      chatInput: document.getElementById('chat-input'),
      btnSend: document.getElementById('btn-send'),
      inputHelperText: document.getElementById('input-helper-text'),
      inputCharCounter: document.getElementById('input-char-counter'),
      chatStatusIndicator: document.getElementById('chat-status-indicator'),
      chatStatusText: document.getElementById('chat-status-text'),
      btnClearChat: document.getElementById('btn-clear-chat'),
      
      // Settings Form Inputs
      settingsOpenaiKey: document.getElementById('settings-openai-key'),
      settingsLocalUrl: document.getElementById('settings-local-url'),
      settingsLocalModel: document.getElementById('settings-local-model'),
      settingsOpenaiModel: document.getElementById('settings-openai-model'),
      settingsTimeout: document.getElementById('settings-timeout'),
      
      // Simulation Knobs
      simOffline: document.getElementById('sim-offline'),
      simFormatError: document.getElementById('sim-format-error'),
      simBlockOpenai: document.getElementById('sim-block-openai'),
      simLatency: document.getElementById('sim-latency'),
      valSimLatency: document.getElementById('val-sim-latency'),
      
      // SVG Graphs
      svgPlaceholder: document.getElementById('svg-placeholder'),
      pathLocal: document.getElementById('path-local'),
      pathOpenai: document.getElementById('path-openai'),
      latencySvg: document.getElementById('latency-svg'),
      
      // Cost Dashboard Elements
      barHybridCost: document.getElementById('bar-hybrid-cost'),
      barOpenaiCost: document.getElementById('bar-openai-cost'),
      barSavingsCost: document.getElementById('bar-savings-cost'),
      valHybridCost: document.getElementById('val-hybrid-cost'),
      valOpenaiCost: document.getElementById('val-openai-cost'),
      valSavingsPercent: document.getElementById('val-savings-percent'),
      
      // Chrome Browser Simulator Bindings
      browserOverlay: document.getElementById('browser-overlay'),
      btnCloseBrowser: document.getElementById('btn-close-browser'),
      browserLoadingScreen: document.getElementById('browser-loading-screen'),
      browserLoadingStatus: document.getElementById('browser-loading-status'),
      browserLogs: document.getElementById('browser-connection-logs'),
      browserUrlInput: document.getElementById('browser-url-input'),
      browserTabText: document.getElementById('browser-tab-text'),
      mockGeminiView: document.getElementById('mock-gemini-view'),
      mockGeneralView: document.getElementById('mock-general-view'),
      geminiTypedInput: document.getElementById('gemini-typed-input'),
      geminiCursor: document.getElementById('gemini-typing-cursor'),
      highlightOverlay: document.getElementById('browser-highlight-overlay'),
      highlightLabel: document.getElementById('browser-highlight-label')
    };

    // 5. Initial setup
    this.init();
  }

  init() {
    this.registerEventListeners();
    this.loadConfigIntoSettingsModal();
    this.updateHUDDisplay();
    this.loadChecklistState();
    this.renderInitialMessage();
  }

  // Register interactive controls
  registerEventListeners() {
    // Mode toggles
    this.dom.btnSimulation.addEventListener('click', () => this.toggleMode(true));
    this.dom.btnLive.addEventListener('click', () => this.toggleMode(false));

    // Settings Modal
    this.dom.btnSettings.addEventListener('click', () => this.dom.modalOverlay.classList.add('active'));
    this.dom.btnCloseSettings.addEventListener('click', () => this.dom.modalOverlay.classList.remove('active'));
    this.dom.btnCancelSettings.addEventListener('click', () => this.dom.modalOverlay.classList.remove('active'));
    this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettings());

    // Tabs Toggles
    this.dom.btnTabAnalytics.addEventListener('click', () => this.switchTab('analytics'));
    this.dom.btnTabSetup.addEventListener('click', () => this.switchTab('setup'));

    // Terminal Copy buttons
    const copyButtons = document.querySelectorAll('.terminal-btn-copy');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-copy');
        if (text) {
          this.copyToClipboard(text, btn);
        }
      });
    });

    // Checklist checkboxes
    const checklistBtns = document.querySelectorAll('.step-checkbox-btn');
    checklistBtns.forEach(btn => {
      const stepNum = btn.getAttribute('data-step');
      btn.addEventListener('click', () => {
        this.toggleChecklistStep(stepNum);
      });
    });

    // Chat submit & character typing
    this.dom.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserSubmit();
    });
    
    this.dom.chatInput.addEventListener('input', () => {
      const len = this.dom.chatInput.value.length;
      this.dom.inputCharCounter.textContent = `${len} char${len !== 1 ? 's' : ''}`;
    });

    this.dom.btnClearChat.addEventListener('click', () => {
      this.dom.chatHistory.innerHTML = '';
      this.messageHistory = [];
      this.renderInitialMessage();
    });

    // Simulator Knobs
    this.dom.simLatency.addEventListener('input', () => {
      const ms = this.dom.simLatency.value;
      this.dom.valSimLatency.textContent = `${ms} ms`;
      if (ms > 0) {
        this.dom.valSimLatency.style.color = ms > this.config.timeoutSeconds * 1000 ? 'var(--color-danger)' : 'var(--color-warning)';
      } else {
        this.dom.valSimLatency.style.color = 'var(--text-secondary)';
      }
    });

    // Auto-save simulation offline switch toggles
    this.dom.simOffline.addEventListener('change', () => {
      this.updateHUDDisplay();
    });

    this.dom.simBlockOpenai.addEventListener('change', () => {
      this.updateHUDDisplay();
    });

    // Close browser viewport
    this.dom.btnCloseBrowser.addEventListener('click', () => {
      this.dom.browserOverlay.classList.remove('active');
    });
  }

  // Toggle between simulated and actual backend
  toggleMode(toSimulation) {
    if (this.isSimulation === toSimulation) return;
    this.isSimulation = toSimulation;
    
    if (this.isSimulation) {
      this.dom.btnSimulation.classList.add('active');
      this.dom.btnLive.classList.remove('active');
      this.dom.btnSimulation.blur();
      this.addSystemNotification("System: Toggled into Sandbox Simulation mode.", 'info');
    } else {
      this.dom.btnSimulation.classList.remove('active');
      this.dom.btnLive.classList.add('active');
      this.dom.btnLive.blur();
      this.addSystemNotification("System: Connected to live Ollama & OpenAI fallback endpoints. Confirm Ollama is running (`ollama serve`).", 'info');
      
      // Warn if API Key is not configured
      if (!this.config.openaiKey) {
        this.addSystemNotification("Warning: No OpenAI API key configured. Fallback calls to OpenAI will fail.", 'error');
      }
    }
    this.updateHUDDisplay();
  }

  // Loads storage configs into Settings form inputs
  loadConfigIntoSettingsModal() {
    this.dom.settingsOpenaiKey.value = this.config.openaiKey;
    this.dom.settingsLocalUrl.value = this.config.localUrl;
    this.dom.settingsLocalModel.value = this.config.localModel;
    this.dom.settingsOpenaiModel.value = this.config.openaiModel;
    this.dom.settingsTimeout.value = this.config.timeoutSeconds;
  }

  // Save Settings Modal inputs to localStorage
  saveSettings() {
    this.config.openaiKey = this.dom.settingsOpenaiKey.value.trim();
    this.config.localUrl = this.dom.settingsLocalUrl.value.trim() || 'http://127.0.0.1:11434/v1';
    this.config.localModel = this.dom.settingsLocalModel.value.trim() || 'qwen3:32b';
    this.config.openaiModel = this.dom.settingsOpenaiModel.value;
    this.config.timeoutSeconds = parseInt(this.dom.settingsTimeout.value, 10) || 5;

    // Persist
    localStorage.setItem('lmlink_openai_key', this.config.openaiKey);
    localStorage.setItem('lmlink_local_url', this.config.localUrl);
    localStorage.setItem('lmlink_local_model', this.config.localModel);
    localStorage.setItem('lmlink_openai_model', this.config.openaiModel);
    localStorage.setItem('lmlink_timeout', this.config.timeoutSeconds.toString());

    this.dom.modalOverlay.classList.remove('active');
    this.addSystemNotification("System Configurations Saved & Reloaded.", 'info');
    this.updateHUDDisplay();
  }

  // Visual layout HUD rendering
  updateHUDDisplay() {
    this.dom.valLocalName.textContent = this.config.localModel;
    
    // Label mapped OpenAI model
    const selectEl = this.dom.settingsOpenaiModel;
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    this.dom.valOpenaiName.textContent = selectedOption ? selectedOption.text.split(' ')[0] : this.config.openaiModel;

    // Local model status badge
    if (this.dom.simOffline.checked) {
      this.dom.badgeLocalStatus.textContent = "Offline (Simulator)";
      this.dom.badgeLocalStatus.className = "hud-badge offline";
      this.dom.chatStatusIndicator.style.background = "var(--color-danger)";
      this.dom.chatStatusIndicator.style.boxShadow = "0 0 8px var(--color-danger)";
      this.dom.chatStatusText.textContent = "Local Model Offline";
    } else {
      const injectedLatency = parseInt(this.dom.simLatency.value, 10);
      if (injectedLatency > this.config.timeoutSeconds * 1000) {
        this.dom.badgeLocalStatus.textContent = `Lagging (${injectedLatency}ms)`;
        this.dom.badgeLocalStatus.className = "hud-badge warning";
        this.dom.chatStatusIndicator.style.background = "var(--color-warning)";
        this.dom.chatStatusIndicator.style.boxShadow = "0 0 8px var(--color-warning)";
        this.dom.chatStatusText.textContent = "Local Model Slow Response";
      } else {
        this.dom.badgeLocalStatus.textContent = this.isSimulation ? `Online (0ms)` : `Live Standby`;
        this.dom.badgeLocalStatus.className = "hud-badge online";
        this.dom.chatStatusIndicator.style.background = "var(--color-local)";
        this.dom.chatStatusIndicator.style.boxShadow = "0 0 8px var(--color-local)";
        this.dom.chatStatusText.textContent = this.isSimulation ? "Simulator Active" : "Connected to Ollama";
      }
    }

    // Fallback status badge
    if (this.dom.simBlockOpenai.checked) {
      this.dom.badgeOpenaiStatus.textContent = "Blocked (Policy)";
      this.dom.badgeOpenaiStatus.className = "hud-badge offline";
    } else if (this.metrics.fallbackCount > 0) {
      this.dom.badgeOpenaiStatus.textContent = `Active (${this.metrics.fallbackCount} fails)`;
      this.dom.badgeOpenaiStatus.className = "hud-badge warning";
    } else {
      this.dom.badgeOpenaiStatus.textContent = "Standby Ready";
      this.dom.badgeOpenaiStatus.className = "hud-badge online";
    }

    // Refresh metrics HUD numbers
    const totalRequests = this.metrics.localSuccess + this.metrics.fallbackCount;
    const rate = totalRequests === 0 ? 0 : Math.round((this.metrics.fallbackCount / totalRequests) * 100);
    this.dom.valFallbackRate.textContent = `${rate}%`;
    this.dom.badgeRatioDetail.textContent = `${this.metrics.fallbackCount} / ${totalRequests} failed over`;
    if (rate > 50) {
      this.dom.badgeRatioDetail.className = "hud-badge offline";
    } else if (rate > 0) {
      this.dom.badgeRatioDetail.className = "hud-badge warning";
    } else {
      this.dom.badgeRatioDetail.className = "hud-badge online";
    }

    // Dynamic cost saving metrics card update
    this.dom.valSavings.textContent = `$${this.metrics.totalSavedDollars.toFixed(3)}`;
    const totalCostRatio = this.metrics.pureOpenAiCost === 0 ? 100 : Math.round((this.metrics.totalSavedDollars / this.metrics.pureOpenAiCost) * 100);
    this.dom.badgeSavings.textContent = `${totalCostRatio}% Saved`;

    // Refresh charts
    this.renderLatencyChart();
    this.renderCostEfficiencyDashboard();
    
    // Update Input Area Label
    if (this.dom.simBlockOpenai.checked) {
      this.dom.inputHelperText.textContent = `Primary: ${this.config.localModel} (${this.isSimulation ? 'Sim' : 'Ollama'}) | Failover: BLOCKED (OpenAI Fallback Disabled)`;
    } else {
      this.dom.inputHelperText.textContent = `Primary: ${this.config.localModel} (${this.isSimulation ? 'Sim' : 'Ollama'}) | Failover: ${this.config.openaiModel}`;
    }
  }

  // Appends initial welcome message to chat
  renderInitialMessage() {
    this.renderMessageBubble(
      'assistant',
      "Welcome! I am **Hermes Agent (Ollama + Qwen3)**, your local open-source agent running on your remote device (Jacks-Mac-Studio.local) and connected via the **Local Router**. If you send me questions, I will try to answer directly from my local Ollama endpoint. However, if my endpoint is offline, lagging, or outputting invalid data formats, the request router will automatically fallback to **OpenAI** seamlessly in real-time.\n\nTry sending a message! You can use the **Simulator Panel** on the right to manually mock latency and offline parameters to see how I recover.",
      'local',
      0,
      false
    );
  }

  // Add system warning notification inside conversation thread
  addSystemNotification(text, type = 'error') {
    const el = document.createElement('div');
    el.className = `system-event ${type}`;
    
    const icon = type === 'error' ? '⚠️' : '⚡';
    el.innerHTML = `<span class="system-event-icon">${icon}</span> ${text}`;
    
    this.dom.chatHistory.appendChild(el);
    this.scrollToBottom();
  }

  // Renders standard prompt bubble (Markdown formatted)
  renderMessageBubble(role, text, sourceModel = 'user', latency = 0, isFallback = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `msg-wrapper ${role}`;
    if (isFallback) {
      wrapper.classList.add('fallback');
    }

    const metadata = document.createElement('div');
    metadata.className = 'msg-metadata';
    
    const roleLabel = role === 'user' ? 'You' : (sourceModel === 'local' ? `Hermes (${this.config.localModel})` : `OpenAI (${this.config.openaiModel})`);
    const tagClass = role === 'user' ? 'tag-user' : (sourceModel === 'local' ? 'tag-local' : 'tag-openai');
    const tagLabel = role === 'user' ? 'User' : (sourceModel === 'local' ? 'Ollama' : 'Fallback');

    metadata.innerHTML = `
      <span>${roleLabel}</span>
      <span class="msg-tag ${tagClass}">${tagLabel}</span>
    `;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = this.parseSimpleMarkdown(text);

    wrapper.appendChild(metadata);
    wrapper.appendChild(bubble);

    // Append to message history if it's from the assistant and is NOT a routing error
    if (role === 'assistant' && !text.startsWith('⚠️')) {
      this.messageHistory.push({ role: 'assistant', content: text });
    }

    // Latency details at bottom of assistant responses
    if (role === 'assistant' && latency > 0) {
      const stats = document.createElement('div');
      stats.className = 'msg-stats';
      stats.innerHTML = `
        <span>Latency: <strong>${latency}ms</strong></span>
        <span>Route: <strong>${isFallback ? 'OpenAI Fallback' : 'Local Host'}</strong></span>
      `;
      wrapper.appendChild(stats);
    }

    this.dom.chatHistory.appendChild(wrapper);
    this.scrollToBottom();
  }

  // Render dummy typing circles
  renderTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'msg-wrapper assistant typing-indicator-wrapper';
    el.innerHTML = `
      <div class="msg-metadata">
        <span>Routing message...</span>
      </div>
      <div class="msg-bubble" style="padding: 0.5rem 1rem;">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    this.dom.chatHistory.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  scrollToBottom() {
    this.dom.chatHistory.scrollTop = this.dom.chatHistory.scrollHeight;
  }

  // Very lightweight markdown formatting parser
  parseSimpleMarkdown(text) {
    let clean = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Code blocks
    clean = clean.replace(/```python([\s\S]*?)```/g, "<pre><code class='language-python'>$1</code></pre>");
    clean = clean.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    
    // Bold markup
    clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Line breaks
    return clean.replace(/\n/g, "<br>");
  }

  // Form submission handler
  async handleUserSubmit() {
    const prompt = this.dom.chatInput.value.trim();
    if (!prompt) return;

    this.dom.chatInput.value = '';
    this.dom.inputCharCounter.textContent = '0 chars';
    this.dom.btnSend.disabled = true;

    // Render User Message
    this.renderMessageBubble('user', prompt);
    this.messageHistory.push({ role: 'user', content: prompt });

    // Show routing animation dot
    const typingIndicator = this.renderTypingIndicator();

    try {
      // Check if it's a browser-related prompt
      const lower = prompt.toLowerCase();
      const isBrowserPrompt = lower.includes('browser') || lower.includes('chrome') || lower.includes('search') || lower.includes('website') || lower.includes('browse') || lower.includes('go to');

      if (isBrowserPrompt) {
        // Trigger visual browser automation viewport animation first!
        await this.triggerBrowserSimulation(prompt);
      }

      if (this.isSimulation) {
        await this.executeSimulatedRouting(prompt, typingIndicator);
      } else {
        await this.executeLiveRouting(prompt, typingIndicator);
      }
    } catch (e) {
      console.error(e);
      typingIndicator.remove();
      this.addSystemNotification(`Router Failure: An unexpected execution error occurred. ${e.message}`, 'error');
    } finally {
      this.dom.btnSend.disabled = false;
      this.updateHUDDisplay();
    }
  }

  // Dynamic high-fidelity simulated response generator for Local model
  generateMockResponse(prompt) {
    const lower = prompt.toLowerCase();
    
    // 1. Math / Computation
    const cleanPrompt = prompt.replace(/x/gi, '*').replace(/times/gi, '*').replace(/plus/gi, '+').replace(/minus/gi, '-').replace(/divided\s+by/gi, '/');
    const mathMatch = cleanPrompt.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
    if (mathMatch) {
      const num1 = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const num2 = parseFloat(mathMatch[3]);
      let result;
      switch(op) {
        case '+': result = num1 + num2; break;
        case '-': result = num1 - num2; break;
        case '*': result = num1 * num2; break;
        case '/': result = num2 !== 0 ? num1 / num2 : 'undefined (cannot divide by zero)'; break;
      }
      return `Calculated locally using my secure math processing module:

$$\n${num1} ${op} ${num2} = ${result}\n$$

Running fully sandboxed on your local hardware, no external computing APIs were reached.`;
    }

    // 1.5. Browser Automation Simulation
    if (lower.includes('browser') || lower.includes('chrome') || lower.includes('search') || lower.includes('website') || lower.includes('browse') || lower.includes('go to')) {
      let target = 'https://gemini.google.com';
      const urlMatch = prompt.match(/(https?:\/\/[^\s]+)/i) || prompt.match(/(www\.[^\s]+)/i) || prompt.match(/to\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (urlMatch) {
        target = urlMatch[1];
        if (!target.startsWith('http')) target = 'https://' + target;
      } else if (lower.includes('gemini') || lower.includes('gemeni')) {
        target = 'https://gemini.google.com';
      } else if (lower.includes('google')) {
        target = 'https://www.google.com';
      }

      if (this.lastScrapedData && this.lastScrapedData.text) {
        const scrapedChunk = this.lastScrapedData.text;
        const scrapedSrc = this.lastScrapedData.source;
        const scrapedTitle = this.lastScrapedData.title;
        
        // Reset lastScrapedData
        this.lastScrapedData = null;
        
        return `🌐 **Sandboxed Browser Controller Activated**
        
Successfully loaded **${scrapedSrc}** ("${scrapedTitle}") and extracted the DOM body content locally in my secure sandbox environment.

**Live Scraped Content Summary:**
${scrapedChunk.length > 800 ? scrapedChunk.substring(0, 800) + '... (truncated)' : scrapedChunk}

Based on this real-time extracted data, here is the answer to your query:
Since I executed this fully locally using my Python bridge helper on your device, all tracking scripts were neutralized and no private tracking tokens were transmitted. Let me know if you would like me to perform clicks or scroll to another section of this site!`;
      }

      return `🌐 **Sandboxed Browser Controller Activated**

Initializing headless Chromium browser instance locally...
- [x] Spawning isolated browser sandbox (\`--headless=new\`)
- [x] Setting user-agent to custom secure telemetry
- [x] Navigating to: **\`${target}\`**
- [x] Page loaded successfully (Status: 200 OK, Load Time: 382ms)

**Page Title:** ${target.includes('gemini') ? 'Gemini - Chat to supercharge your ideas' : target.includes('google') ? 'Google' : 'Local Sandbox Mock View'}

**Extracted Text Content (Truncated):**
> "Secure local scraping completed successfully. Extracted main layout body, cleared trackers, and formatted text for model reading context."

**Simulated Action Executed:**
- Locating active form elements... Found primary input fields.
- Running sandbox evaluation script to extract text successfully.

*Running fully sandboxed, this simulation demonstrates how Hermes coordinates browser scraping tools locally when Codex or a local browser agent is active.*`;
    }

    // 2. System Date / Time
    if (lower.includes('date') || lower.includes('time') || lower.includes('today') || lower.includes('now') || lower.includes('day')) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `Today's date is **${dateStr}**. The current local system time is **${timeStr}**.

Running fully offline, my clock is synchronized directly with **Jacks-Mac-Studio.local**'s hardware clock.`;
    }

    // 3. Context / History referencing
    if (lower.includes('history') || lower.includes('previous') || lower.includes('last message') || lower.includes('what did i') || lower.includes('remember')) {
      const userTurns = this.messageHistory.filter(m => m.role === 'user');
      if (userTurns.length > 1) {
        const prevPrompt = userTurns[userTurns.length - 2].content;
        return `Checking our conversation history context... In your previous turn, you asked: *"${prevPrompt}"*.

We have currently engaged in a total of **${this.messageHistory.length} turns** during this active session. Because I maintain full session context in local memory, all previous turns remain active in my memory window!`;
      } else {
        return `I am currently maintaining our active conversation history, but this is your very first query in this session! As we continue chatting, I will preserve every single turn in my context window.`;
      }
    }

    // 4. Capability descriptions
    if (lower.includes('what can you do') || lower.includes('help') || lower.includes('features') || lower.includes('capabilities') || lower.includes('who are you')) {
      return `As **Hermes Agent (Qwen3:32B)**, I can perform a wide range of tasks fully locally:
- 🔒 **Privacy-Preserving Conversations**: Discuss confidential matters without cloud monitoring.
- 🧮 **Local Computations & Logic**: Perform mathematical processing, offline system checks, and local file analysis.
- 💻 **Code Generation & Review**: Write clean, secure code (Python, JavaScript, etc.) without exposing your IP.
- 📡 **System Integration Routing**: Sync with your gateway endpoints and coordinate seamless fallback failover triggers.`;
    }

    // 5. Weather estimations
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast')) {
      return `Checking my offline local environment... Since I have no live internet connection in this sandbox, I estimate the local weather based on standard seasonal metrics: it's likely a pleasant **68°F (20°C)** with clear skies in your area! 

*(Note: Connect me to an external search tool or API plugin for real-time live telemetry).*`;
    }

    // 6. Generic/default conversation response
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return this.mockDatabase.greeting.local;
    } else if (lower.includes('code') || lower.includes('python') || lower.includes('write')) {
      return this.mockDatabase.code.local;
    } else if (lower.includes('slow') || lower.includes('delay') || lower.includes('lag')) {
      return this.mockDatabase.slow.local;
    }

    return `That's a fascinating question! I'm reasoning through your request: *"${prompt}"* using my Qwen3 (32B) network. Because you are running me locally via Ollama, we can explore this topic in extreme detail with zero token fees or privacy concerns. 

What specific aspects of this would you like to investigate further?`;
  }

  // Dynamic high-fidelity simulated response generator for OpenAI Fallback model
  generateMockOpenaiResponse(prompt) {
    const lower = prompt.toLowerCase();

    // 1. Math / Computation
    const cleanPrompt = prompt.replace(/x/gi, '*').replace(/times/gi, '*').replace(/plus/gi, '+').replace(/minus/gi, '-').replace(/divided\s+by/gi, '/');
    const mathMatch = cleanPrompt.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
    if (mathMatch) {
      const num1 = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const num2 = parseFloat(mathMatch[3]);
      let result;
      switch(op) {
        case '+': result = num1 + num2; break;
        case '-': result = num1 - num2; break;
        case '*': result = num1 * num2; break;
        case '/': result = num2 !== 0 ? num1 / num2 : 'undefined (cannot divide by zero)'; break;
      }
      return `I am stepping in as a fallback to complete your request. OpenAI Fallback computed:

$$\n${num1} ${op} ${num2} = ${result}\n$$

I processed this query immediately on our remote cloud infrastructure.`;
    }

    // 1.5. Browser Automation Simulation
    if (lower.includes('browser') || lower.includes('chrome') || lower.includes('search') || lower.includes('website') || lower.includes('browse') || lower.includes('go to')) {
      let target = 'https://gemini.google.com';
      const urlMatch = prompt.match(/(https?:\/\/[^\s]+)/i) || prompt.match(/(www\.[^\s]+)/i) || prompt.match(/to\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (urlMatch) {
        target = urlMatch[1];
        if (!target.startsWith('http')) target = 'https://' + target;
      } else if (lower.includes('gemini') || lower.includes('gemeni')) {
        target = 'https://gemini.google.com';
      } else if (lower.includes('google')) {
        target = 'https://www.google.com';
      }

      if (this.lastScrapedData && this.lastScrapedData.text) {
        const scrapedChunk = this.lastScrapedData.text;
        const scrapedSrc = this.lastScrapedData.source;
        const scrapedTitle = this.lastScrapedData.title;
        
        // Reset lastScrapedData
        this.lastScrapedData = null;
        
        return `🌐 **OpenAI Browser Tool Interceptor**
        
Stepping in as fallback router! Successfully parsed the page content for **${scrapedSrc}** ("${scrapedTitle}") via cloud Selenium node.

**Live Extracted Page Text:**
${scrapedChunk.length > 800 ? scrapedChunk.substring(0, 800) + '... (truncated)' : scrapedChunk}

Based on this fallback web search, I have resolved your request:
Since your local Ollama server is offline, I have compiled these live details for your request. Let me know what you would like to analyze next!`;
      }

      return `🌐 **OpenAI Browser Tool Interceptor**

Stepping in as fallback router! Launching cloud browser automation executor:
- [x] Initializing remote Selenium/Playwright browser node
- [x] Navigating browser viewport to: **\`${target}\`**
- [x] Bypassing robot verification protocols successfully
- [x] Extracting semantic DOM tree nodes

**Extracted Summary:**
Successfully gathered web page content from **\`${target}\`**. Since your local browser gateway was offline, I have compiled the web data on the cloud and passed the formatted markdown chunk directly back to your active session.

Let me know what browser actions (clicks, keyboard inputs, form submissions) I should execute next!`;
    }

    // 2. System Date / Time
    if (lower.includes('date') || lower.includes('time') || lower.includes('today') || lower.includes('now') || lower.includes('day')) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `I'm stepping in as a fallback since the local server is unavailable. According to the system request payload, today's date is **${dateStr}** and the current time is **${timeStr}**.`;
    }

    // 3. Context / History referencing
    if (lower.includes('history') || lower.includes('previous') || lower.includes('last message') || lower.includes('what did i') || lower.includes('remember')) {
      const userTurns = this.messageHistory.filter(m => m.role === 'user');
      if (userTurns.length > 1) {
        const prevPrompt = userTurns[userTurns.length - 2].content;
        return `As your OpenAI fallback, I have retrieved our conversation history context from the routing payload. In your previous turn, you asked: *"${prevPrompt}"*. 

I have full access to all **${this.messageHistory.length} turns** in this active session history to maintain continuity.`;
      } else {
        return `I am active as your fallback agent and am tracking our active conversation history, but this is your first query in the session!`;
      }
    }

    // 4. Capability descriptions
    if (lower.includes('what can you do') || lower.includes('help') || lower.includes('features') || lower.includes('capabilities') || lower.includes('who are you')) {
      return `As your **OpenAI Fallback Agent**, I step in when the local host is unreachable or lagging. I can:
- ⚡ **Full GPT-4o mini Conversational Power**: Provide advanced reasoning, creative writing, and analysis.
- 🌐 **Always Online Reliability**: Guarantee responses even when local hardware fails.
- 📂 **Multi-file Coding Support**: Solve complex architectural or debugging problems.`;
    }

    // 5. Weather estimations
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast')) {
      return `Stepping in as a fallback! While I don't have access to your live real-time GPS sensors, standard meteorological models suggest current conditions are around **65°F (18°C)** with a light breeze. Fallback telemetry successfully verified.`;
    }

    // 6. Generic/default conversation response
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return this.mockDatabase.greeting.openai;
    } else if (lower.includes('code') || lower.includes('python') || lower.includes('write')) {
      return this.mockDatabase.code.openai;
    } else if (lower.includes('slow') || lower.includes('delay') || lower.includes('lag')) {
      return this.mockDatabase.slow.openai;
    }

    return `I am processing your query *"${prompt}"* on behalf of your offline local model. Since I am your cloud fallback, I have full reasoning capabilities and can assist you with any advanced details or questions you have. 

Let me know how you would like to proceed!`;
  }

  // -------------------------------------------------------------
  // HIGH-FIDELITY BROWSER AUTOMATION VIEWPORT SIMULATOR
  // -------------------------------------------------------------
  async triggerBrowserSimulation(prompt) {
    // 1. Show browser overlay
    this.dom.browserOverlay.classList.add('active');

    // 2. Parse target URL / search terms
    let targetUrl = 'https://gemini.google.com';
    let isGemini = true;
    let isSearch = false;
    let searchQuery = '';
    const lower = prompt.toLowerCase();
    
    const urlMatch = prompt.match(/(https?:\/\/[^\s]+)/i) || prompt.match(/(www\.[^\s]+)/i) || prompt.match(/to\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (urlMatch) {
      targetUrl = urlMatch[1];
      if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
      isGemini = targetUrl.includes('gemini');
    } else if (lower.includes('google')) {
      targetUrl = 'https://www.google.com';
      isGemini = false;
    } else if (lower.includes('search') || lower.includes('browse') || lower.includes('find') || lower.includes('weather') || lower.includes('news')) {
      isSearch = true;
      isGemini = false;
      searchQuery = prompt.replace(/search|for|browse|find|the|latest/gi, '').trim();
      if (!searchQuery) searchQuery = prompt;
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    }

    // 3. Reset all simulation UI states
    this.dom.browserUrlInput.value = 'about:blank';
    this.dom.browserTabText.textContent = 'New Tab';
    this.dom.browserLoadingScreen.classList.remove('fade-out');
    this.dom.browserLoadingStatus.textContent = 'Spawning isolated browser...';
    this.dom.browserLogs.innerHTML = '';
    this.dom.mockGeminiView.style.display = 'none';
    this.dom.mockGeneralView.style.display = 'none';
    this.dom.highlightOverlay.classList.remove('active');
    this.dom.geminiTypedInput.textContent = 'Ask Gemini...';
    this.dom.geminiTypedInput.classList.remove('typing');
    this.dom.geminiCursor.classList.remove('active');

    const appendLog = (text, type = '') => {
      const logEl = document.createElement('div');
      logEl.className = `log-entry ${type}`;
      logEl.textContent = text;
      this.dom.browserLogs.appendChild(logEl);
      this.dom.browserLogs.scrollTop = this.dom.browserLogs.scrollHeight;
    };

    // 4. CDP Socket Handshake Logs
    appendLog('[SYSTEM] Spawning headless Chromium process...', 'accent');
    await this.sleep(300);
    appendLog('[SYSTEM] Launching Google Chrome on debugging port 9222...', 'accent');
    await this.sleep(300);
    appendLog('[SYSTEM] Establishing CDP socket handshake on ws://localhost:9222...', 'accent');
    await this.sleep(400);
    appendLog('[SYSTEM] Connected to Chrome DevTools Protocol!', 'success');
    await this.sleep(200);
    appendLog('[CDP Target] Target.createTarget({ url: "about:blank" })', 'success');
    await this.sleep(200);

    // 5. Typewrite URL into Address Bar
    this.dom.browserLoadingStatus.textContent = `Navigating to ${targetUrl}...`;
    this.dom.browserUrlInput.value = '';
    for (let i = 0; i < Math.min(targetUrl.length, 60); i++) {
      this.dom.browserUrlInput.value += targetUrl[i];
      await this.sleep(15);
    }
    if (targetUrl.length > 60) {
      this.dom.browserUrlInput.value = targetUrl;
    }
    
    appendLog(`[CDP Action] Page.navigate({ url: "${targetUrl}" })`, 'success');
    
    // Start backend fetch concurrently during navigation wait
    let realData = null;
    try {
      if (isSearch) {
        appendLog(`[SYSTEM] Querying real local search proxy for: "${searchQuery}"`, 'accent');
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          realData = await res.json();
          appendLog('[SYSTEM] Search results retrieved from DuckDuckGo successfully.', 'success');
        }
      } else if (!isGemini && targetUrl !== 'https://www.google.com') {
        appendLog(`[SYSTEM] Scraped page HTML via proxy from: ${targetUrl}`, 'accent');
        const res = await fetch(`/api/fetch?url=${encodeURIComponent(targetUrl)}`);
        if (res.ok) {
          realData = await res.json();
          appendLog(`[SYSTEM] Page content parsed successfully. Title: "${realData.title}"`, 'success');
        }
      }
    } catch (e) {
      console.warn("Backend proxy server is not running or unreachable. Falling back to default high-fidelity sandbox values.", e);
      appendLog('[WARNING] Local proxy server unreachable. Running offline sandbox emulator.', 'warning');
    }

    await this.sleep(500);

    // 6. Reveal Viewport Mockup
    this.dom.browserLoadingScreen.classList.add('fade-out');
    
    if (isGemini) {
      this.dom.browserTabText.textContent = 'Gemini - Chat to supercharge your ideas';
      this.dom.mockGeminiView.style.display = 'flex';
      await this.sleep(500);

      // Perform Gemini mock typing
      appendLog('[CDP Action] DOM.querySelector({ selector: "textarea" })', 'success');
      await this.sleep(200);

      // Highlight input area
      const inputBox = this.dom.mockGeminiView.querySelector('.gemini-input-box');
      if (inputBox) {
        const rect = inputBox.getBoundingClientRect();
        const parentRect = this.dom.mockGeminiView.querySelector('.gemini-main').getBoundingClientRect();
        this.dom.highlightOverlay.style.left = `${rect.left - parentRect.left}px`;
        this.dom.highlightOverlay.style.top = `${rect.top - parentRect.top}px`;
        this.dom.highlightOverlay.style.width = `${rect.width}px`;
        this.dom.highlightOverlay.style.height = `${rect.height}px`;
      }
      
      this.dom.highlightLabel.textContent = '[CDP Action] focus_element("textarea")';
      this.dom.highlightOverlay.classList.add('active');
      await this.sleep(500);

      // Type action query
      this.dom.geminiTypedInput.textContent = '';
      this.dom.geminiTypedInput.classList.add('typing');
      this.dom.geminiCursor.classList.add('active');

      const typeString = "Analyze Jack's workspace and optimize the fallbacks.";
      for (let i = 0; i < typeString.length; i++) {
        this.dom.geminiTypedInput.textContent += typeString[i];
        await this.sleep(25);
      }

      this.dom.geminiCursor.classList.remove('active');
      await this.sleep(300);

      appendLog('[CDP Action] Click element: button.submit', 'success');
      this.dom.highlightLabel.textContent = '[CDP Action] click_element("button.submit")';
      await this.sleep(400);
      this.dom.highlightOverlay.classList.remove('active');

      this.lastScrapedData = {
        source: 'gemini.google.com',
        title: 'Gemini Workspace Analytics',
        text: 'Local workspace diagnostics show 100% security containment. Sandboxed browser controller is running fully operational.'
      };

    } else {
      this.dom.mockGeneralView.style.display = 'block';
      
      const titleEl = document.getElementById('general-web-title');
      const bodyContentEl = document.getElementById('general-web-body-content');

      if (realData && isSearch) {
        this.dom.browserTabText.textContent = `Search: ${searchQuery}`;
        if (titleEl) titleEl.textContent = `Search Results for "${searchQuery}"`;
        
        if (bodyContentEl && realData.results && realData.results.length > 0) {
          bodyContentEl.innerHTML = '';
          realData.results.forEach(res => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
              <h3>${res.title}</h3>
              <a href="${res.url}" target="_blank">${res.url}</a>
              <p>${res.snippet}</p>
            `;
            bodyContentEl.appendChild(div);
          });
        }
        
        this.lastScrapedData = {
          source: 'DuckDuckGo Search',
          title: `Search: ${searchQuery}`,
          text: realData.results.map(r => `[Title] ${r.title}\n[Link] ${r.url}\n[Snippet] ${r.snippet}`).join('\n\n')
        };

      } else if (realData && !isSearch) {
        this.dom.browserTabText.textContent = realData.title;
        if (titleEl) titleEl.textContent = realData.title;
        
        if (bodyContentEl) {
          bodyContentEl.innerHTML = `
            <div class="search-result-item" style="background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05);">
              <h3 style="color: var(--color-local); cursor: default;">Webpage Scraped Successfully</h3>
              <a href="${targetUrl}" target="_blank">${targetUrl}</a>
              <div style="color: #c4c7c5; font-size: 0.8rem; line-height: 1.6; margin-top: 12px; white-space: pre-wrap; max-height: 350px; overflow-y: auto;">
                ${realData.text}
              </div>
            </div>
          `;
        }
        
        this.lastScrapedData = {
          source: targetUrl,
          title: realData.title,
          text: realData.text
        };
        
      } else {
        this.dom.browserTabText.textContent = 'Google Search';
        if (titleEl) titleEl.textContent = `Search Results for "${prompt}"`;
        
        this.lastScrapedData = {
          source: 'Google Search Sandbox',
          title: 'Google Search results',
          text: 'Ollama is a tool for running large language models locally. Nous Research Hermes is a fine-tuned version of Qwen/Mistral models optimized for reasoning and agentic tasks.'
        };
      }
      
      await this.sleep(500);

      // Perform General search query logging
      appendLog('[CDP Action] DOM.querySelector({ selector: "input[type=search]" })', 'success');
      await this.sleep(200);
      appendLog(`[CDP Action] Keyboard.type({ text: "${searchQuery || prompt}" })`, 'success');
      await this.sleep(300);
      appendLog('[CDP Action] Keyboard.press({ key: "Enter" })', 'success');
      await this.sleep(400);
    }

    // 7. Finish automation session
    appendLog('[SYSTEM] Secure scraping complete. Extracting body text...', 'accent');
    await this.sleep(300);
    appendLog('[SYSTEM] Clear tracking scripts & closed CDP session.', 'accent');
    await this.sleep(400);

    // Fade out browser window
    this.dom.browserOverlay.classList.remove('active');
    await this.sleep(400);
  }

  // -------------------------------------------------------------
  // SIMULATION ROUTING MODE
  // -------------------------------------------------------------
  async executeSimulatedRouting(prompt, typingEl) {
    const start = performance.now();
    const isOffline = this.dom.simOffline.checked;
    const isFormatError = this.dom.simFormatError.checked;
    const isBlockOpenai = this.dom.simBlockOpenai.checked;
    const injectedLatency = parseInt(this.dom.simLatency.value, 10);
    const timeoutThreshold = this.config.timeoutSeconds * 1000;

    // 1. Check Offline
    if (isOffline) {
      await this.sleep(400); // Fast fail connection try
      typingEl.remove();
      
      if (isBlockOpenai) {
        this.addSystemNotification("Routing Intercepted: Local LLM is offline. Fallback to OpenAI is BLOCKED by active policy.", 'error');
        this.renderMessageBubble('assistant', "⚠️ **ROUTING ERROR: Local Host Offline**\n\nThe local model is currently offline or unreachable. An outbound fallback request to OpenAI was attempted, but it has been strictly **blocked** by your active local-only isolation policy. No external network request was sent.", 'local', 0, false);
        this.logMetrics(0, 0, false, true);
      } else {
        this.addSystemNotification("Failover Alert: Local LLM is offline. Redirecting request to OpenAI fallback endpoint...");
        
        const openaiStart = performance.now();
        const typingFallback = this.renderTypingIndicator();
        await this.sleep(1200); // Simulate OpenAI query time
        typingFallback.remove();
        
        const openaiLatency = Math.round(performance.now() - openaiStart);
        const mockReply = this.generateMockOpenaiResponse(prompt);
        
        this.renderMessageBubble('assistant', mockReply, 'openai', openaiLatency, true);
        this.logMetrics(0, openaiLatency, true);
      }
      return;
    }

    // 2. Simulate Local latency (includes timeout checks)
    const localStart = performance.now();
    if (injectedLatency > 0) {
      // If latency is higher than timeout, we stop midway at the timeout limit to simulate AbortController triggering
      if (injectedLatency >= timeoutThreshold) {
        await this.sleep(timeoutThreshold);
        typingEl.remove();
        
        if (isBlockOpenai) {
          this.addSystemNotification(`Abort Event: Local LLM exceeded timeout threshold of ${this.config.timeoutSeconds}s. Fallback to OpenAI is BLOCKED by active policy.`, 'error');
          this.renderMessageBubble('assistant', `⚠️ **ROUTING ERROR: Connection Timeout**\n\nThe local request timed out after exceeding the ${this.config.timeoutSeconds}s threshold. Fallback to OpenAI was **blocked** by your active local-only isolation policy.`, 'local', timeoutThreshold, false);
          this.logMetrics(timeoutThreshold, 0, false, true);
        } else {
          this.addSystemNotification(`Abort Event: Local LLM exceeded timeout threshold of ${this.config.timeoutSeconds}s. Cancelling request and routing to OpenAI fallback...`);
          
          const openaiStart = performance.now();
          const typingFallback = this.renderTypingIndicator();
          await this.sleep(1100);
          typingFallback.remove();
          
          const openaiLatency = Math.round(performance.now() - openaiStart);
          const mockReply = this.generateMockOpenaiResponse(prompt);
          
          this.renderMessageBubble('assistant', mockReply, 'openai', openaiLatency, true);
          this.logMetrics(timeoutThreshold, openaiLatency, true);
        }
        return;
      } else {
        await this.sleep(injectedLatency);
      }
    } else {
      await this.sleep(600); // baseline simulation delay
    }

    // 3. Simulate parsing format failures
    if (isFormatError) {
      const localLatency = Math.round(performance.now() - localStart);
      typingEl.remove();
      
      if (isBlockOpenai) {
        this.addSystemNotification(`Format Alert: Received output from ${this.config.localModel} but failed custom JSON format checks. Fallback to OpenAI is BLOCKED by active policy.`, 'error');
        this.renderMessageBubble('assistant', `⚠️ **ROUTING ERROR: Output Format Validation Failure**\n\nReceived response from the local model, but it failed custom JSON validation checks. Fallback to OpenAI was **blocked** by your active local-only isolation policy.\n\n**Raw Local Output:**\n{\n  "error": "Failed to parse structured response from local agent."\n}`, 'local', localLatency, false);
        this.logMetrics(localLatency, 0, false, true);
      } else {
        this.addSystemNotification(`Format Alert: Received output from ${this.config.localModel} but failed custom JSON format checks. Retrying prompt via OpenAI...`);
        
        const openaiStart = performance.now();
        const typingFallback = this.renderTypingIndicator();
        await this.sleep(1300);
        typingFallback.remove();
        
        const openaiLatency = Math.round(performance.now() - openaiStart);
        const mockReply = this.generateMockOpenaiResponse(prompt);
        
        this.renderMessageBubble('assistant', mockReply, 'openai', openaiLatency, true);
        this.logMetrics(localLatency, openaiLatency, true);
      }
      return;
    }

    // 4. Standard successful Local response routing
    typingEl.remove();
    const localLatency = Math.round(performance.now() - localStart);
    const mockReply = this.generateMockResponse(prompt);
    this.renderMessageBubble('assistant', mockReply, 'local', localLatency, false);
    this.logMetrics(localLatency, 0, false);
  }

  // -------------------------------------------------------------
  // LIVE CONNECTIONS ROUTING MODE (Direct Ollama / OpenAI API)
  // -------------------------------------------------------------
  async executeLiveRouting(prompt, typingEl) {
    const isOffline = this.dom.simOffline.checked;
    const isFormatError = this.dom.simFormatError.checked;
    const isBlockOpenai = this.dom.simBlockOpenai.checked;
    const injectedLatency = parseInt(this.dom.simLatency.value, 10);
    const timeoutLimitMs = this.config.timeoutSeconds * 1000;

    // Simulate custom local latency if slider is active in Live mode
    if (injectedLatency > 0) {
      await this.sleep(injectedLatency > timeoutLimitMs ? timeoutLimitMs : injectedLatency);
    }

    // Mock Offline toggle even in live connection mode for testing simulation controls
    if (isOffline) {
      typingEl.remove();
      if (isBlockOpenai) {
        this.addSystemNotification(`Failover Alert (Simulated): Direct Ollama routing disabled. Fallback to OpenAI is BLOCKED by active policy.`, 'error');
        this.renderMessageBubble('assistant', "⚠️ **ROUTING ERROR: Local Host Offline**\n\nThe local model is currently offline or unreachable. An outbound fallback request to OpenAI was attempted, but it has been strictly **blocked** by your active local-only isolation policy. No external network request was sent.", 'local', 0, false);
        this.logMetrics(0, 0, false, true);
      } else {
        this.addSystemNotification(`Failover Alert (Simulated): Direct Ollama routing disabled. Falling back to OpenAI...`);
        await this.fetchOpenAiFallback(prompt);
      }
      return;
    }

    // If local latency slider exceeded timeout threshold
    if (injectedLatency >= timeoutLimitMs) {
      typingEl.remove();
      if (isBlockOpenai) {
        this.addSystemNotification(`Timeout Alert (Simulated): Injected delay surpassed local timeout limit. Fallback to OpenAI is BLOCKED by active policy.`, 'error');
        this.renderMessageBubble('assistant', `⚠️ **ROUTING ERROR: Connection Timeout**\n\nThe local request timed out after exceeding the ${this.config.timeoutSeconds}s threshold. Fallback to OpenAI was **blocked** by your active local-only isolation policy.`, 'local', timeoutLimitMs, false);
        this.logMetrics(timeoutLimitMs, 0, false, true);
      } else {
        this.addSystemNotification(`Timeout Alert (Simulated): Injected delay surpassed local timeout limit. Falling back to OpenAI...`);
        await this.fetchOpenAiFallback(prompt);
      }
      return;
    }

    const startLocal = performance.now();

    // Abort controller handles network timeout limits
    const localController = new AbortController();
    const timeoutId = setTimeout(() => localController.abort(), timeoutLimitMs);

    try {
      // Build fetch request to LM Studio endpoint (OpenAI compatible endpoint /chat/completions)
      const fetchUrl = `${this.config.localUrl}/chat/completions`;
      
      const requestMessages = JSON.parse(JSON.stringify(this.messageHistory));
      if (this.lastScrapedData) {
        const lastMsg = requestMessages[requestMessages.length - 1];
        if (lastMsg && lastMsg.role === 'user') {
          lastMsg.content = `[System Scraped Context: Real-time data retrieved from navigating the web for "${this.lastScrapedData.title}" (${this.lastScrapedData.source}):\n"""\n${this.lastScrapedData.text}\n"""]\n\nUser request: ${lastMsg.content}`;
        }
        this.lastScrapedData = null; // reset
      }

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.localModel,
          messages: requestMessages,
          stream: false
        }),
        signal: localController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      const data = await response.json();
      const localLatency = Math.round(performance.now() - startLocal);
      const localReplyText = data.choices[0].message.content;

      // Check simulated parsing error on output
      if (isFormatError) {
        typingEl.remove();
        if (isBlockOpenai) {
          this.addSystemNotification(`Validation Alert: Local model completed request in ${localLatency}ms, but output failed JSON validation checks. Fallback to OpenAI is BLOCKED by active policy.`, 'error');
          this.renderMessageBubble('assistant', `⚠️ **ROUTING ERROR: Output Format Validation Failure**\n\nReceived response from the local model, but it failed custom JSON validation checks. Fallback to OpenAI was **blocked** by your active local-only isolation policy.\n\n**Raw Local Output:**\n{\n  "error": "Failed to parse structured response from local agent."\n}`, 'local', localLatency, false);
          this.logMetrics(localLatency, 0, false, true);
        } else {
          this.addSystemNotification(`Validation Alert: Local model completed request in ${localLatency}ms, but output failed JSON validation checks. Redirecting to OpenAI...`);
          this.logMetrics(localLatency, 0, true); // Log fail for metric
          await this.fetchOpenAiFallback(prompt);
        }
        return;
      }

      // Success
      typingEl.remove();
      this.renderMessageBubble('assistant', localReplyText, 'local', localLatency, false);
      this.logMetrics(localLatency, 0, false);

    } catch (e) {
      clearTimeout(timeoutId);
      typingEl.remove();

      let errorMessage = e.message;
      if (e.name === 'AbortError') {
        errorMessage = `Local request timed out after exceeding ${this.config.timeoutSeconds}s threshold.`;
      }

      const elapsed = Math.round(performance.now() - startLocal);

      if (isBlockOpenai) {
        this.addSystemNotification(`Router Failover Intercepted: Connection to local Ollama failed or aborted (${errorMessage}). Fallback to OpenAI is BLOCKED by active policy.`, 'error');
        this.renderMessageBubble('assistant', `⚠️ **ROUTING ERROR: Connection Failed**\n\nThe local request failed or was aborted: *${errorMessage}*. Fallback to OpenAI was **blocked** by your active local-only isolation policy.`, 'local', elapsed, false);
        this.logMetrics(elapsed, 0, false, true);
      } else {
        this.addSystemNotification(`Router Failover: Connection to local Ollama failed or aborted (${errorMessage}). Launching fallback sequence to OpenAI...`);
        await this.fetchOpenAiFallback(prompt, elapsed);
      }
    }
  }

  // Fallback direct request executor for OpenAI completions
  async fetchOpenAiFallback(prompt, localLatencyElapsed = 0) {
    if (!this.config.openaiKey) {
      this.addSystemNotification("System Failover Aborted: No OpenAI API key registered. Please enter a key in Settings config.", 'error');
      return;
    }

    const startOpenAi = performance.now();
    const typingFallback = this.renderTypingIndicator();

    try {
      const requestMessages = JSON.parse(JSON.stringify(this.messageHistory));
      if (this.lastScrapedData) {
        const lastMsg = requestMessages[requestMessages.length - 1];
        if (lastMsg && lastMsg.role === 'user') {
          lastMsg.content = `[System Scraped Context: Real-time data retrieved from navigating the web for "${this.lastScrapedData.title}" (${this.lastScrapedData.source}):\n"""\n${this.lastScrapedData.text}\n"""]\n\nUser request: ${lastMsg.content}`;
        }
        this.lastScrapedData = null; // reset
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openaiKey}`
        },
        body: JSON.stringify({
          model: this.config.openaiModel,
          messages: [
            { role: 'system', content: 'You are an advanced AI assistant performing as a fallback system. The user primary local LLM has failed. Answer their prompt comprehensively, acknowledging that you are stepping in if appropriate.' },
            ...requestMessages
          ]
        })
      });

      typingFallback.remove();

      if (!response.ok) {
        throw new Error(`OpenAI API error status: ${response.status}`);
      }

      const data = await response.json();
      const openaiLatency = Math.round(performance.now() - startOpenAi);
      const openaiReplyText = data.choices[0].message.content;

      this.renderMessageBubble('assistant', openaiReplyText, 'openai', openaiLatency, true);
      this.logMetrics(localLatencyElapsed, openaiLatency, true);

    } catch (e) {
      typingFallback.remove();
      this.addSystemNotification(`Critical Crash: Both Local and Fallback endpoints failed. OpenAI Error: ${e.message}`, 'error');
    }
  }

  // -------------------------------------------------------------
  // ANALYTICS & LOGGING SYSTEM
  // -------------------------------------------------------------
  logMetrics(localLatency, openaiLatency, isFallback, isBlocked = false) {
    const flatRateOpenAi = this.pricing[this.config.openaiModel]?.flatCost || 0.002;
    
    // Keep record in latency logs (max 10 points for nice layout charting)
    this.metrics.latencyHistory.push({
      local: localLatency,
      openai: openaiLatency,
      isFallback: isFallback,
      isBlocked: isBlocked
    });

    if (this.metrics.latencyHistory.length > 10) {
      this.metrics.latencyHistory.shift();
    }

    // Cost saving updates
    if (isBlocked) {
      // Avoid incrementing standard local chat successes or fallback counts.
      // But increment pureOpenAiCost and totalSavedDollars, showing cost savings (as we avoided calling paid OpenAI).
      this.metrics.pureOpenAiCost += flatRateOpenAi;
      this.metrics.totalSavedDollars += flatRateOpenAi;
    } else if (isFallback) {
      this.metrics.fallbackCount++;
      // We had to call OpenAI, so we pay flat cost
      this.metrics.hybridRouterCost += flatRateOpenAi;
      this.metrics.pureOpenAiCost += flatRateOpenAi;
      // Saving for this call is zero since we fell back to OpenAI
    } else {
      this.metrics.localSuccess++;
      // Free call locally!
      this.metrics.pureOpenAiCost += flatRateOpenAi; // If we ran only on OpenAI, we would have paid
      this.metrics.totalSavedDollars += flatRateOpenAi; // Accumulated money saved!
    }

    // Refresh display elements
    this.updateHUDDisplay();
  }

  // Logic rendering custom SVG Line graphs using programmatic coordinate mapping
  renderLatencyChart() {
    const points = this.metrics.latencyHistory;
    if (points.length === 0) {
      this.dom.svgPlaceholder.style.display = 'block';
      this.dom.pathLocal.setAttribute('d', '');
      this.dom.pathOpenai.setAttribute('d', '');
      return;
    }

    this.dom.svgPlaceholder.style.display = 'none';

    // SVG Layout boundaries: X from 40 to 390. Y from 140 (0ms) to 20 (10000ms / 10s max scaling)
    const xMin = 40;
    const xMax = 390;
    const yZero = 140;
    const yTop = 20;
    
    const maxValLimit = 10000; // 10 seconds scale ceiling

    const xSpacing = points.length > 1 ? (xMax - xMin) / (points.length - 1) : 0;

    let localPathPoints = [];
    let openaiPathPoints = [];

    // Helper maps millisecond value into Y coordinates
    const mapY = (ms) => {
      const clamped = Math.min(ms, maxValLimit);
      const ratio = clamped / maxValLimit;
      return yZero - ratio * (yZero - yTop);
    };

    points.forEach((pt, index) => {
      const x = xMin + index * xSpacing;
      
      // Local
      if (pt.local > 0) {
        localPathPoints.push(`${x},${mapY(pt.local)}`);
      }
      
      // OpenAI
      if (pt.openai > 0) {
        openaiPathPoints.push(`${x},${mapY(pt.openai)}`);
      }
    });

    // Update SVG string attributes
    if (localPathPoints.length > 0) {
      this.dom.pathLocal.setAttribute('d', `M ${localPathPoints.join(' L ')}`);
    } else {
      this.dom.pathLocal.setAttribute('d', '');
    }

    if (openaiPathPoints.length > 0) {
      this.dom.pathOpenai.setAttribute('d', `M ${openaiPathPoints.join(' L ')}`);
    } else {
      this.dom.pathOpenai.setAttribute('d', '');
    }
  }

  // Programmatic Cost Analytics bar chart percentages renderer
  renderCostEfficiencyDashboard() {
    this.dom.valHybridCost.textContent = `$${this.metrics.hybridRouterCost.toFixed(3)}`;
    this.dom.valOpenaiCost.textContent = `$${this.metrics.pureOpenAiCost.toFixed(3)}`;

    if (this.metrics.pureOpenAiCost === 0) {
      this.dom.barHybridCost.style.width = '0%';
      this.dom.barOpenaiCost.style.width = '0%';
      this.dom.barSavingsCost.style.width = '100%';
      this.dom.valSavingsPercent.textContent = '100%';
    } else {
      // Calculate normalized width bounds
      const ratio = this.metrics.hybridRouterCost / this.metrics.pureOpenAiCost;
      const hybridPercent = Math.round(ratio * 100);
      const savingsPercent = 100 - hybridPercent;

      this.dom.barHybridCost.style.width = `${hybridPercent}%`;
      this.dom.barOpenaiCost.style.width = '100%';
      this.dom.barSavingsCost.style.width = `${savingsPercent}%`;
      this.dom.valSavingsPercent.textContent = `${savingsPercent}%`;
    }
  }

  // Sleep utility helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Tab switching logic
  switchTab(tabName) {
    if (tabName === 'analytics') {
      this.dom.btnTabAnalytics.classList.add('active');
      this.dom.btnTabSetup.classList.remove('active');
      this.dom.contentAnalytics.classList.add('active');
      this.dom.contentSetup.classList.remove('active');
    } else if (tabName === 'setup') {
      this.dom.btnTabAnalytics.classList.remove('active');
      this.dom.btnTabSetup.classList.add('active');
      this.dom.contentAnalytics.classList.remove('active');
      this.dom.contentSetup.classList.add('active');
    }
  }

  // Copy text to clipboard with micro-animations
  copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHTML = btn.innerHTML;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  // Load persistent checklist completion state from LocalStorage
  loadChecklistState() {
    const checklistBtns = document.querySelectorAll('.step-checkbox-btn');
    checklistBtns.forEach(btn => {
      const stepNum = btn.getAttribute('data-step');
      const completed = localStorage.getItem(`hermes_step_${stepNum}`) === 'true';
      this.updateChecklistUI(stepNum, completed);
    });
  }

  // Toggle step state in checklist
  toggleChecklistStep(stepNum) {
    const completed = localStorage.getItem(`hermes_step_${stepNum}`) === 'true';
    const newState = !completed;
    localStorage.setItem(`hermes_step_${stepNum}`, newState ? 'true' : 'false');
    this.updateChecklistUI(stepNum, newState);
  }

  // Synchronize checklist step styling UI
  updateChecklistUI(stepNum, completed) {
    const btn = document.querySelector(`.step-checkbox-btn[data-step="${stepNum}"]`);
    const stepContainer = document.getElementById(`setup-step-${stepNum}`);
    if (!btn) return;

    if (completed) {
      btn.innerHTML = '<span class="checkbox-icon">✅</span> Done';
      btn.classList.add('completed');
      if (stepContainer) {
        stepContainer.classList.add('completed');
      }
    } else {
      btn.innerHTML = '<span class="checkbox-icon">⬜</span> Mark Done';
      btn.classList.remove('completed');
      if (stepContainer) {
        stepContainer.classList.remove('completed');
      }
    }
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
