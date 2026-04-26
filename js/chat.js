
import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  /* =========================
     SUPABASE SETUP
  ========================== */

  const chatStyles = document.createElement("style");
  chatStyles.textContent = `
    /* FIX: Ensure chat UI stays strictly above all dashboard elements */
    #chatToggle {
      z-index: 99999 !important;
    }
    #chatContainer {
      z-index: 99999 !important;
    }
    .message-footer {
      display: flex;
      justify-content: flex-end;
      align-items: left;
      gap: 4px;
      font-size: 0.72em;
      opacity: 0.7;
      margin-top: 4px;
      line-height: 1;
    }
    .message-time { white-space: nowrap; }
    .message-tick { letter-spacing: -1.5px; }

    /* LOGIN PROMPT */
    .login-prompt {
      text-align: center;
      padding: 20px;
      opacity: 0.8;
    }
    .login-prompt button {
      margin-top: 10px;
      padding: 8px 14px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: #007bff;
      color: white;
    }
    /* FORCE FLEX LAYOUT ON PARENT */
    #messages, .chat-messages {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important; /* CRITICAL FIX: Forces rows to 100% width, killing centering */
      width: 100% !important;
      box-sizing: border-box !important;
    }
    /* AVATAR SYSTEM STYLES */
    .message-row {
      display: flex !important;
      align-items: flex-end !important;
      gap: 8px !important;
      margin-bottom: 12px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .message-row.user {
      flex-direction: row !important;
      justify-content: flex-end !important; /* Force to the right edge */
    }
    .message-row.user .chat-avatar {
      order: 2 !important; /* Safely moves avatar to the right side of the bubble */
    }
    .message-row.user .message {
      order: 1 !important;
    }
    .message-row.admin {
      flex-direction: row !important;
      justify-content: flex-start !important;
    }
    .chat-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .chat-avatar.admin {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%);
      color: white;
    }
    .chat-avatar.user {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    /* MODERN MESSAGE BUBBLES */
    .message {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 0.95rem;
      line-height: 1.4;
      word-break: break-word;
      display: flex;
      flex-direction: column;
      text-align: left !important; /* CRITICAL FIX: Kill inherited centering */
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .message.user {
      background-color: #007bff;
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .message.admin {
      background-color: #f1f5f9;
      color: #0f172a;
      border-bottom-left-radius: 4px;
    }
    .message.user .message-footer {
      color: rgba(255, 255, 255, 0.8);
    }
    .message.admin .message-footer {
      color: rgba(0, 0, 0, 0.5);
    }
  `;
  document.head.appendChild(chatStyles);


  /* =========================
     ELEMENTS
  ========================== */
  const chatToggle = document.getElementById("chatToggle");
  const chatContainer = document.getElementById("chatContainer");
  const closeChat = document.getElementById("closeChat");
  const messagesDiv = document.getElementById("messages");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const badge = document.getElementById("chatBadge");

  if (!chatToggle || !chatContainer || !messagesDiv || !input || !sendBtn) {
    console.error("Chat UI elements missing");
    return;
  }

  let userId = null;
  let unreadCount = 0;
  let isLoggedIn = false;

  chatContainer.style.display = "none";

  /* =========================
     AUTH SESSION
  ========================== */
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    userId = session.user.id;
    isLoggedIn = true;
  }

  /* =========================
     LOGIN PROMPT UI
  ========================== */
  function showLoginPrompt() {
    messagesDiv.innerHTML = `
      <div class="login-prompt">
        <p>Please log in to chat with support</p>
        <button id="loginRedirectBtn">Login</button>
      </div>
    `;

    input.disabled = true;
    sendBtn.disabled = true;

    const btn = document.getElementById("loginRedirectBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        window.location.href = "login.html"; // adjust if needed
      });
    }
  }

  /* =========================
     UI HELPERS
  ========================== */
  function toggleChat(open) {
    if (open) {
      chatContainer.style.display = "flex";
      chatContainer.classList.add("open");
      chatContainer.classList.remove("hidden");

      if (!isLoggedIn) {
        showLoginPrompt();
        return;
      }

      markMessagesRead();

      setTimeout(() => {
        input.focus();
        // Ensure scroll to bottom when opening
        messagesDiv.scrollTo({
          top: messagesDiv.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);

    } else {
      chatContainer.style.display = "none";
      chatContainer.classList.remove("open");
      chatContainer.classList.add("hidden");
    }
  }

  function formatTime(timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    if (isNaN(date.getTime())) return "";
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  function addMessage(msg) {
    if (!msg) return;

    // FIX: Remove "No messages yet" placeholder when a real message arrives
    const emptyPlaceholder = messagesDiv.querySelector("p");
    if (emptyPlaceholder && emptyPlaceholder.textContent === "No messages yet") {
      emptyPlaceholder.remove();
    }

    // FIX: Prevent duplicate message rendering in the DOM
    if (msg.id && messagesDiv.querySelector(`.message-row[data-id="${msg.id}"]`)) return;

    // CRITICAL LOGIC DEBUG: Verify accurate data injection
    console.log("=== CHAT DEBUG ===");
    console.log("Sender Data:", msg.sender);

    const isUser = (msg.sender || "").trim().toLowerCase() === "user";

    // 1. Create a flex wrapper for alignment
    const wrapper = document.createElement("div");
    wrapper.className = `message-row ${isUser ? "user" : "admin"}`;
    if (msg.id) wrapper.dataset.id = msg.id;
    console.log("Assigned Classes:", wrapper.className);

    // 2. Create the Avatar
    const avatar = document.createElement("div");
    avatar.className = `chat-avatar ${isUser ? "user" : "admin"}`;
    avatar.innerHTML = isUser ? "👤" : "🎧"; // Default Fallbacks

    // 3. Create the Message Bubble
    const div = document.createElement("div");
    div.className = `message ${isUser ? "user" : "admin"}`;

    const content = document.createElement("span");
    content.textContent = msg.message || "";

    const footer = document.createElement("div");
    footer.className = "message-footer";

    const timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    timeSpan.textContent = formatTime(msg.created_at);

    footer.appendChild(timeSpan);

    if (isUser) {
      const tickSpan = document.createElement("span");
      tickSpan.className = "message-tick";
      tickSpan.textContent = msg.is_read ? "✔✔" : "✔";
      footer.appendChild(tickSpan);
    }

    div.appendChild(content);
    div.appendChild(footer);

    wrapper.appendChild(avatar);
    wrapper.appendChild(div);

    messagesDiv.appendChild(wrapper);

    // Smooth scroll to bottom with a small delay to ensure DOM update
    setTimeout(() => {
      messagesDiv.scrollTo({
        top: messagesDiv.scrollHeight,
        behavior: 'smooth'
      });
    }, 10);
  }

  /* =========================
     LOAD MESSAGES
  ========================== */
  async function loadMessages() {
    if (!isLoggedIn) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      messagesDiv.innerHTML = "";
      if (!data || data.length === 0) {
        messagesDiv.innerHTML = `<p style="text-align:center;opacity:0.6;">No messages yet</p>`;
        return;
      }

      data.forEach(addMessage);
      await fetchUnreadCount();
    } catch (err) {
      console.error("Load messages error:", err);
    }
  }

  /* =========================
     SEND MESSAGE
  ========================== */
  async function sendMessage() {
    if (!isLoggedIn) {
      showLoginPrompt();
      return;
    }

    const text = input.value.trim();
    if (!text) return;

    // FIX: Disable inputs while sending to prevent rapid double-submissions
    sendBtn.disabled = true;
    input.disabled = true;
    sendBtn.style.opacity = '0.5';

    try {
      const { error } = await supabase
        .from("messages")
        .insert([{
          user_id: userId,
          sender: "user",
          message: text,
          is_read: false
        }]);

      if (error) throw error;

      input.value = "";
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      // Restore inputs regardless of success or failure
      sendBtn.disabled = false;
      input.disabled = false;
      sendBtn.style.opacity = '1';
      input.focus();
    }
  }

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* =========================
     UNREAD COUNT
  ========================== */
  async function fetchUnreadCount() {
    if (!isLoggedIn) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id")
        .eq("user_id", userId)
        .eq("sender", "admin")
        .eq("is_read", false);

      if (error) throw error;

      unreadCount = data ? data.length : 0;

      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.classList.remove("hidden");
          badge.style.display = "flex";
        } else {
          badge.textContent = "0";
          badge.classList.add("hidden");
          badge.style.display = "none";
        }
      }
    } catch (err) {
      console.error("Unread count error:", err);
    }
  }

  async function markMessagesRead() {
    if (!isLoggedIn) return;

    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("sender", "admin")
        .eq("is_read", false);

      if (error) throw error;

      unreadCount = 0;
      if (badge) {
        badge.textContent = "0";
        badge.classList.add("hidden");
        badge.style.display = "none";
      }
    } catch (err) {
      console.error("Mark messages read error:", err);
    }
  }

  /* =========================
     EVENTS
  ========================== */
  chatToggle.addEventListener("click", () => {
    const isOpen = chatContainer.classList.contains("open");
    toggleChat(!isOpen);
  });

  closeChat.addEventListener("click", () => toggleChat(false));

  /* =========================
     REALTIME
  ========================== */
  if (isLoggedIn) {
    supabase
      .channel("chat-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new;
          if (!msg || msg.user_id !== userId) return;

          if (payload.eventType === "INSERT") {
            addMessage(msg);

            if (!chatContainer.classList.contains("open") && msg.sender === "admin") {
              unreadCount++;
              badge.textContent = unreadCount;
              badge.classList.remove("hidden");
              badge.style.display = "flex";
            }
          } else if (payload.eventType === "UPDATE") {
            const msgWrapper = document.querySelector(`.message-row[data-id="${msg.id}"]`);
            if (msgWrapper && msg.sender === "user") {
              const tickSpan = msgWrapper.querySelector(".message-tick");
              if (tickSpan) {
                tickSpan.textContent = msg.is_read ? "✔✔" : "✔";
              }
            }
          }
        }
      )
      .subscribe();
  }

  /* =========================
     INITIAL LOAD
  ========================== */
  if (isLoggedIn) {
    await loadMessages();
    await fetchUnreadCount();
  }
});