/**
 * widget.js
 * ---------
 * Self-contained chat widget for Roger R.'s portfolio page.
 *
 * How it works:
 *   1. This script injects its own HTML structure and CSS into the page when loaded.
 *   2. A toggle button in the bottom-right corner opens/closes the chat panel.
 *   3. When the user submits a message, it POSTs to the backend API and displays
 *      the response — or an error message if something went wrong.
 *   4. On mobile, the chat panel expands to a centered full-screen overlay.
 *
 * Configuration:
 *   Set the `data-api` attribute on the script tag to point to your backend:
 *   <script src="/static/widget.js" data-api="https://your-api-host.com"></script>
 *   If data-api is not set, it defaults to http://localhost:8000.
 *
 * Styling:
 *   Matches the portfolio's black/white, monospace, minimal aesthetic.
 *   Uses Georgia serif for body text, monospace for labels and UI chrome.
 *   No colors — just black, white, and grays.
 *
 * Dependencies: None. Pure Vanilla JS + CSS. No frameworks required.
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  // Read the API base URL from the script tag's data-api attribute.
  // Falls back to localhost:8000 for local development.
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();
  var API_BASE = (currentScript.getAttribute("data-api") || "http://localhost:8000").replace(/\/$/, "");
  var CHAT_ENDPOINT = API_BASE + "/api/chat";

  // ---------------------------------------------------------------------------
  // CSS injection
  // ---------------------------------------------------------------------------

  var WIDGET_CSS = `
    /* ---- Chat toggle button (bottom-right corner) ---- */
    #rr-chat-toggle {
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
      transition: background 0.15s;
      font-family: monospace;
    }
    #rr-chat-toggle:hover {
      background: #333;
    }

    /* ---- Chat panel ---- */
    #rr-chat-panel {
      position: fixed;
      bottom: 90px;
      right: 28px;
      width: 360px;
      max-height: 520px;
      background: #fff;
      border: 1px solid #111;
      display: none;
      flex-direction: column;
      z-index: 9998;
      font-family: Georgia, serif;
      font-size: 15px;
      line-height: 1.6;
    }
    #rr-chat-panel.open {
      display: flex;
    }

    /* ---- Panel header ---- */
    #rr-chat-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
    }
    #rr-chat-header-title {
      font-family: monospace;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
    }
    #rr-chat-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      color: #888;
      padding: 0;
      line-height: 1;
    }
    #rr-chat-close:hover {
      color: #111;
    }

    /* ---- Message list ---- */
    #rr-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 100px;
    }
    .rr-msg {
      max-width: 85%;
      padding: 10px 13px;
      font-size: 14px;
      line-height: 1.55;
    }
    .rr-msg.user {
      align-self: flex-end;
      background: #111;
      color: #fff;
      border-radius: 0;
    }
    .rr-msg.assistant {
      align-self: flex-start;
      background: #f5f5f5;
      color: #111;
      border-radius: 0;
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

    /* ---- Loading indicator (animated dots) ---- */
    .rr-loading {
      display: flex;
      gap: 5px;
      padding: 12px 16px;
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

    /* ---- Input area ---- */
    #rr-chat-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    #rr-chat-input {
      flex: 1;
      border: 1px solid #ccc;
      padding: 8px 10px;
      font-family: Georgia, serif;
      font-size: 14px;
      line-height: 1.5;
      resize: none;
      min-height: 38px;
      max-height: 100px;
      color: #111;
      background: #fff;
      outline: none;
      border-radius: 0;
    }
    #rr-chat-input:focus {
      border-color: #111;
    }
    #rr-chat-submit {
      background: #111;
      color: #fff;
      border: none;
      padding: 9px 14px;
      cursor: pointer;
      font-family: monospace;
      font-size: 13px;
      white-space: nowrap;
      transition: background 0.15s;
      align-self: flex-end;
      height: 38px;
    }
    #rr-chat-submit:hover {
      background: #333;
    }
    #rr-chat-submit:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    /* ---- Rate limit / error notice ---- */
    #rr-chat-notice {
      font-family: monospace;
      font-size: 11px;
      color: #aaa;
      text-align: center;
      padding: 4px 16px 10px;
    }

    /* ---- Mobile: full-screen overlay ---- */
    @media (max-width: 480px) {
      #rr-chat-panel {
        position: fixed;
        bottom: 0;
        right: 0;
        left: 0;
        top: 0;
        width: 100%;
        max-height: 100%;
        border: none;
        border-radius: 0;
      }
      #rr-chat-toggle {
        bottom: 20px;
        right: 20px;
      }
    }
  `;

  // ---------------------------------------------------------------------------
  // HTML injection
  // ---------------------------------------------------------------------------

  var WIDGET_HTML = `
    <button id="rr-chat-toggle" aria-label="Open chat" title="Ask about Roger">💬</button>

    <div id="rr-chat-panel" role="dialog" aria-modal="true" aria-label="Chat with Roger's assistant">
      <div id="rr-chat-header">
        <span id="rr-chat-header-title">Ask about Roger</span>
        <button id="rr-chat-close" aria-label="Close chat">&times;</button>
      </div>

      <div id="rr-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
        <div class="rr-msg assistant">
          Hi — I can answer questions about Roger's experience, projects, skills, and certifications. What would you like to know?
        </div>
      </div>

      <div id="rr-chat-input-area">
        <textarea
          id="rr-chat-input"
          placeholder="Ask a question..."
          rows="1"
          maxlength="500"
          aria-label="Your question"
        ></textarea>
        <button id="rr-chat-submit">Send</button>
      </div>
      <div id="rr-chat-notice">Powered by Gemini · Questions about Roger only</div>
    </div>
  `;

  // ---------------------------------------------------------------------------
  // DOM initialization
  // ---------------------------------------------------------------------------

  function injectStyles() {
    var styleEl = document.createElement("style");
    styleEl.id = "rr-chat-styles";
    styleEl.textContent = WIDGET_CSS;
    document.head.appendChild(styleEl);
  }

  function injectHTML() {
    var container = document.createElement("div");
    container.innerHTML = WIDGET_HTML;
    document.body.appendChild(container);
  }

  // ---------------------------------------------------------------------------
  // Widget logic
  // ---------------------------------------------------------------------------

  var isOpen = false;
  var isWaiting = false;

  function togglePanel() {
    isOpen = !isOpen;
    var panel = document.getElementById("rr-chat-panel");
    var toggle = document.getElementById("rr-chat-toggle");
    if (isOpen) {
      panel.classList.add("open");
      toggle.setAttribute("aria-label", "Close chat");
      toggle.textContent = "✕";
      document.getElementById("rr-chat-input").focus();
    } else {
      panel.classList.remove("open");
      toggle.setAttribute("aria-label", "Open chat");
      toggle.textContent = "💬";
    }
  }

  function appendMessage(role, text) {
    var messagesEl = document.getElementById("rr-chat-messages");

    var msgEl = document.createElement("div");
    msgEl.className = "rr-msg " + role;
    msgEl.textContent = text;

    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msgEl;
  }

  function showLoading() {
    var messagesEl = document.getElementById("rr-chat-messages");
    var loaderEl = document.createElement("div");
    loaderEl.className = "rr-loading";
    loaderEl.id = "rr-chat-loader";
    loaderEl.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(loaderEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideLoading() {
    var loaderEl = document.getElementById("rr-chat-loader");
    if (loaderEl) {
      loaderEl.remove();
    }
  }

  function setInputDisabled(disabled) {
    document.getElementById("rr-chat-input").disabled = disabled;
    document.getElementById("rr-chat-submit").disabled = disabled;
  }

  function autoResizeTextarea(textarea) {
    // Reset height to auto to recalculate, then set to scrollHeight.
    // This makes the textarea grow with the content up to the CSS max-height.
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  }

  async function sendMessage() {
    if (isWaiting) return;

    var inputEl = document.getElementById("rr-chat-input");
    var message = inputEl.value.trim();
    if (!message) return;

    // Clear the input and disable it while waiting.
    inputEl.value = "";
    inputEl.style.height = "auto";
    isWaiting = true;
    setInputDisabled(true);

    // Show the user's message in the chat.
    appendMessage("user", message);

    // Show the loading indicator.
    showLoading();

    // Abort the request if the server takes longer than 60 seconds.
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 60000);

    try {
      var response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      hideLoading();

      if (response.status === 429) {
        appendMessage("error", "Too many requests. Please try again in a while.");
      } else if (response.status === 400) {
        appendMessage("error", "Message could not be processed. Please rephrase your question.");
      } else if (!response.ok) {
        appendMessage("error", "Something went wrong. Please try again.");
      } else {
        var data = await response.json();
        appendMessage("assistant", data.response);
      }
    } catch (networkError) {
      clearTimeout(timeoutId);
      hideLoading();
      if (networkError.name === "AbortError") {
        appendMessage("error", "Response timed out. The model is taking too long — try again.");
      } else {
        appendMessage("error", "Connection error. Please check your connection and try again.");
      }
    } finally {
      isWaiting = false;
      setInputDisabled(false);
      document.getElementById("rr-chat-input").focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Event binding
  // ---------------------------------------------------------------------------

  function bindEvents() {
    document.getElementById("rr-chat-toggle").addEventListener("click", togglePanel);
    document.getElementById("rr-chat-close").addEventListener("click", togglePanel);
    document.getElementById("rr-chat-submit").addEventListener("click", sendMessage);

    var inputEl = document.getElementById("rr-chat-input");

    // Submit on Enter (without Shift). Shift+Enter inserts a newline.
    inputEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize the textarea as the user types.
    inputEl.addEventListener("input", function () {
      autoResizeTextarea(inputEl);
    });

    // Panel only closes via the ✕ button or the toggle button — not by clicking outside.

    // Close with Escape key.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen) {
        togglePanel();
      }
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

  // Run after the DOM is ready.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
