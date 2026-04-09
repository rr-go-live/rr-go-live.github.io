/**
 * widget.js
 * ---------
 * Self-contained two-tab widget for Roger R.'s portfolio page.
 *
 * Tabs:
 *   1. Email  — compose a message, opens the user's mail client via mailto
 *   2. Chat   — AI assistant powered by the FastAPI backend
 *
 * External trigger:
 *   Any link with data-rr-tab="email" or data-rr-tab="chat" will open
 *   the widget to that tab when clicked. Used by the nav "email me" link.
 *
 * Configuration:
 *   <script src="/static/widget.js" data-api="https://your-api-host.com"></script>
 *   Defaults to http://localhost:8000 if data-api is not set.
 *
 * Dependencies: None. Pure Vanilla JS + CSS.
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var API_BASE       = (currentScript.getAttribute("data-api") || "http://localhost:8000").replace(/\/$/, "");
  var CHAT_ENDPOINT  = API_BASE + "/api/chat";
  var CONTACT_EMAIL  = "roger.m.ramesh@gmail.com";

  // ---------------------------------------------------------------------------
  // CSS
  // ---------------------------------------------------------------------------

  var CSS = `
    #rr-toggle {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #111;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      font-family: monospace;
      transition: background 0.15s;
    }
    #rr-toggle:hover { background: #333; }

    #rr-panel {
      position: fixed;
      bottom: 90px;
      right: 28px;
      width: 360px;
      background: #fff;
      border: 1px solid #111;
      display: none;
      flex-direction: column;
      z-index: 9998;
      font-family: Georgia, serif;
      font-size: 15px;
      line-height: 1.6;
      max-height: 540px;
    }
    #rr-panel.open { display: flex; }

    /* ---- Tab bar ---- */
    #rr-tabs {
      display: flex;
      border-bottom: 1px solid #e0e0e0;
      background: #fff;
    }
    .rr-tab {
      flex: 1;
      padding: 11px 0;
      font-family: monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #aaa;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.15s;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .rr-tab:hover { color: #555; }
    .rr-tab.active {
      color: #111;
      border-bottom-color: #111;
    }

    /* ---- Header row ---- */
    #rr-header {
      padding: 10px 16px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #rr-header-title {
      font-family: monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
    }
    #rr-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      color: #888;
      padding: 0;
      line-height: 1;
    }
    #rr-close:hover { color: #111; }

    /* ---- Panels ---- */
    .rr-pane { display: none; flex-direction: column; flex: 1; overflow: hidden; }
    .rr-pane.active { display: flex; }

    /* ── Email pane ── */
    #rr-email-pane {
      padding: 18px 16px;
      gap: 10px;
      overflow-y: auto;
    }
    #rr-email-pane label {
      font-family: monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #888;
      display: block;
      margin-bottom: 3px;
    }
    #rr-email-pane input,
    #rr-email-pane textarea {
      width: 100%;
      border: 1px solid #ccc;
      padding: 8px 10px;
      font-family: Georgia, serif;
      font-size: 14px;
      color: #111;
      background: #fff;
      outline: none;
      border-radius: 0;
      box-sizing: border-box;
      resize: none;
    }
    #rr-email-pane input:focus,
    #rr-email-pane textarea:focus { border-color: #111; }
    #rr-email-pane textarea { min-height: 100px; }
    .rr-email-field { display: flex; flex-direction: column; }
    #rr-email-send {
      margin-top: 4px;
      background: #111;
      color: #fff;
      border: none;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      letter-spacing: 0.04em;
      cursor: pointer;
      transition: background 0.15s;
      align-self: stretch;
    }
    #rr-email-send:hover { background: #333; }
    #rr-email-note {
      font-family: monospace;
      font-size: 11px;
      color: #aaa;
      text-align: center;
      margin-top: 2px;
    }

    /* ── Chat pane ── */
    #rr-chat-pane { overflow: hidden; }
    #rr-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 120px;
      max-height: 300px;
    }
    .rr-msg {
      max-width: 85%;
      padding: 9px 12px;
      font-size: 14px;
      line-height: 1.55;
    }
    .rr-msg.user {
      align-self: flex-end;
      background: #111;
      color: #fff;
    }
    .rr-msg.assistant {
      align-self: flex-start;
      background: #f5f5f5;
      color: #111;
      border-left: 2px solid #111;
    }
    .rr-msg.error {
      align-self: flex-start;
      background: #fff;
      color: #888;
      border-left: 2px solid #ccc;
      font-family: monospace;
      font-size: 13px;
    }
    .rr-loading {
      display: flex;
      gap: 5px;
      padding: 10px 14px;
      align-self: flex-start;
    }
    .rr-loading span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #888;
      animation: rr-bounce 1.2s infinite;
    }
    .rr-loading span:nth-child(2) { animation-delay: 0.2s; }
    .rr-loading span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes rr-bounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
      40% { transform: translateY(-5px); opacity: 1; }
    }
    #rr-input-area {
      padding: 10px 14px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    #rr-input {
      flex: 1;
      border: 1px solid #ccc;
      padding: 8px 10px;
      font-family: Georgia, serif;
      font-size: 14px;
      resize: none;
      min-height: 38px;
      max-height: 100px;
      color: #111;
      background: #fff;
      outline: none;
      border-radius: 0;
    }
    #rr-input:focus { border-color: #111; }
    #rr-send {
      background: #111;
      color: #fff;
      border: none;
      padding: 9px 13px;
      cursor: pointer;
      font-family: monospace;
      font-size: 13px;
      transition: background 0.15s;
      height: 38px;
    }
    #rr-send:hover { background: #333; }
    #rr-send:disabled { background: #ccc; cursor: not-allowed; }
    #rr-chat-notice {
      font-family: monospace;
      font-size: 11px;
      color: #aaa;
      text-align: center;
      padding: 4px 14px 8px;
    }

    /* ---- Mobile ---- */
    @media (max-width: 480px) {
      #rr-panel {
        position: fixed;
        inset: 0;
        width: 100%;
        max-height: 100%;
        bottom: 0;
        right: 0;
        border: none;
      }
      #rr-toggle { bottom: 20px; right: 20px; }
    }
  `;

  // ---------------------------------------------------------------------------
  // HTML
  // ---------------------------------------------------------------------------

  var HTML = `
    <button id="rr-toggle" aria-label="Open contact panel">💬</button>

    <div id="rr-panel" role="dialog" aria-modal="true" aria-label="Contact Roger">

      <div id="rr-tabs">
        <button class="rr-tab active" data-pane="email">Email</button>
        <button class="rr-tab"        data-pane="chat">AI Assistant</button>
      </div>

      <div id="rr-header">
        <span id="rr-header-title">Get in touch</span>
        <button id="rr-close" aria-label="Close">&times;</button>
      </div>

      <!-- Email pane -->
      <div id="rr-email-pane" class="rr-pane active">
        <div class="rr-email-field">
          <label for="rr-name">Your name</label>
          <input id="rr-name" type="text" placeholder="Jane Smith" maxlength="80" />
        </div>
        <div class="rr-email-field">
          <label for="rr-subject">Subject</label>
          <input id="rr-subject" type="text" placeholder="Reaching out about..." maxlength="120" />
        </div>
        <div class="rr-email-field">
          <label for="rr-body">Message</label>
          <textarea id="rr-body" placeholder="Your message..." maxlength="2000"></textarea>
        </div>
        <button id="rr-email-send">Open in mail app →</button>
        <p id="rr-email-note">Opens your default mail client</p>
      </div>

      <!-- Chat pane -->
      <div id="rr-chat-pane" class="rr-pane">
        <div id="rr-messages" role="log" aria-live="polite">
          <div class="rr-msg assistant">
            Hi — I can answer questions about Roger's experience, projects, skills, and certifications. What would you like to know?
          </div>
        </div>
        <div id="rr-input-area">
          <textarea id="rr-input" placeholder="Ask a question..." rows="1" maxlength="500" aria-label="Your question"></textarea>
          <button id="rr-send">Send</button>
        </div>
        <div id="rr-chat-notice">Powered by Gemini · Questions about Roger only</div>
      </div>

    </div>
  `;

  // ---------------------------------------------------------------------------
  // Inject
  // ---------------------------------------------------------------------------

  function injectStyles() {
    var el = document.createElement("style");
    el.id = "rr-widget-styles";
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function injectHTML() {
    var wrap = document.createElement("div");
    wrap.innerHTML = HTML;
    document.body.appendChild(wrap);
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var isOpen      = false;
  var isWaiting   = false;
  var activePane  = "email";

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function openPanel(tab) {
    isOpen = true;
    document.getElementById("rr-panel").classList.add("open");
    document.getElementById("rr-toggle").textContent = "✕";
    document.getElementById("rr-toggle").setAttribute("aria-label", "Close panel");
    if (tab) switchTab(tab);
  }

  function closePanel() {
    isOpen = false;
    document.getElementById("rr-panel").classList.remove("open");
    document.getElementById("rr-toggle").textContent = "💬";
    document.getElementById("rr-toggle").setAttribute("aria-label", "Open contact panel");
  }

  function switchTab(pane) {
    activePane = pane;

    // Update tab buttons
    document.querySelectorAll(".rr-tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.pane === pane);
    });

    // Update panes
    document.getElementById("rr-email-pane").classList.toggle("active", pane === "email");
    document.getElementById("rr-chat-pane").classList.toggle("active", pane === "chat");

    // Update header label
    document.getElementById("rr-header-title").textContent =
      pane === "email" ? "Get in touch" : "Ask about Roger";

    // Focus relevant field
    if (pane === "email") {
      document.getElementById("rr-name").focus();
    } else {
      document.getElementById("rr-input").focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Email send
  // ---------------------------------------------------------------------------

  function sendEmail() {
    var name    = document.getElementById("rr-name").value.trim();
    var subject = document.getElementById("rr-subject").value.trim();
    var body    = document.getElementById("rr-body").value.trim();

    if (!body) {
      document.getElementById("rr-body").focus();
      return;
    }

    // Build the mailto body — include sender name if provided
    var mailBody = name ? "Hi Roger,\n\n" + body + "\n\n— " + name : body;
    var mailSubject = subject || "Reaching out from your portfolio";

    var mailto = "mailto:" + CONTACT_EMAIL
      + "?subject=" + encodeURIComponent(mailSubject)
      + "&body="    + encodeURIComponent(mailBody);

    window.location.href = mailto;
  }

  // ---------------------------------------------------------------------------
  // Chat send
  // ---------------------------------------------------------------------------

  function appendMessage(role, text) {
    var el = document.createElement("div");
    el.className = "rr-msg " + role;
    el.textContent = text;
    var log = document.getElementById("rr-messages");
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function showLoading() {
    var el = document.createElement("div");
    el.className = "rr-loading";
    el.id = "rr-loader";
    el.innerHTML = "<span></span><span></span><span></span>";
    var log = document.getElementById("rr-messages");
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function hideLoading() {
    var el = document.getElementById("rr-loader");
    if (el) el.remove();
  }

  function setInputDisabled(val) {
    document.getElementById("rr-input").disabled = val;
    document.getElementById("rr-send").disabled  = val;
  }

  async function sendChat() {
    if (isWaiting) return;

    var inputEl  = document.getElementById("rr-input");
    var message  = inputEl.value.trim();
    if (!message) return;

    inputEl.value = "";
    inputEl.style.height = "auto";
    isWaiting = true;
    setInputDisabled(true);
    appendMessage("user", message);
    showLoading();

    var controller = new AbortController();
    var timeoutId  = setTimeout(function () { controller.abort(); }, 60000);

    try {
      var res = await fetch(CHAT_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: message }),
        signal:  controller.signal,
      });

      clearTimeout(timeoutId);
      hideLoading();

      if (res.status === 429) {
        appendMessage("error", "Too many requests. Please try again in a while.");
      } else if (res.status === 400) {
        appendMessage("error", "Message could not be processed. Please rephrase your question.");
      } else if (!res.ok) {
        appendMessage("error", "Something went wrong. Please try again.");
      } else {
        var data = await res.json();
        appendMessage("assistant", data.response);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      hideLoading();
      appendMessage("error",
        err.name === "AbortError"
          ? "Response timed out. Please try again."
          : "Connection error. Please check your connection."
      );
    } finally {
      isWaiting = false;
      setInputDisabled(false);
      document.getElementById("rr-input").focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Event binding
  // ---------------------------------------------------------------------------

  function bindEvents() {
    // Toggle open/close
    document.getElementById("rr-toggle").addEventListener("click", function () {
      isOpen ? closePanel() : openPanel(activePane);
    });

    // Close button
    document.getElementById("rr-close").addEventListener("click", closePanel);

    // Tab buttons
    document.querySelectorAll(".rr-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.dataset.pane);
      });
    });

    // Email send
    document.getElementById("rr-email-send").addEventListener("click", sendEmail);

    // Chat send button
    document.getElementById("rr-send").addEventListener("click", sendChat);

    // Chat enter key
    document.getElementById("rr-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });

    // Chat textarea auto-resize
    document.getElementById("rr-input").addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 100) + "px";
    });

    // Escape key closes panel
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) closePanel();
    });

    // Nav "email me" link — any link with data-rr-tab attribute
    document.querySelectorAll("[data-rr-tab]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        openPanel(link.getAttribute("data-rr-tab"));
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  function init() {
    injectStyles();
    injectHTML();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
