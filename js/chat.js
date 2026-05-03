
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
    .chat-input button#attachBtn {
      background: transparent;
      color: #111;
      padding: 10px;
      font-size: 18px;
    }
    #fileIndicator {
      font-size: 0.75rem;
      padding: 6px 12px;
      color: #666;
      background: #f9f9f9;
      border-top: 1px solid #eee;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: none;
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

  let attachBtn, fileInput, fileIndicator;
  if (input && input.parentNode) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "chatFileInput";
    fileInput.style.display = "none";
    
    attachBtn = document.createElement("button");
    attachBtn.innerHTML = "📎";
    attachBtn.id = "attachBtn";
    attachBtn.title = "Attach file or image";
    attachBtn.onclick = () => fileInput.click();

    input.parentNode.insertBefore(attachBtn, sendBtn);
    input.parentNode.insertBefore(fileInput, sendBtn);

    fileIndicator = document.createElement("div");
    fileIndicator.id = "fileIndicator";
    input.parentNode.parentNode.insertBefore(fileIndicator, input.parentNode);
  }

  let selectedFile = null;
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      selectedFile = e.target.files[0];
      if (selectedFile) {
        fileIndicator.textContent = `📎 Attached: ${selectedFile.name}`;
        fileIndicator.style.display = "block";
      } else {
        fileIndicator.style.display = "none";
      }
    });
  }

  if (!chatToggle || !chatContainer || !messagesDiv || !input || !sendBtn) {
    console.error("Chat UI elements missing");
    return;
  }

  // --- EXPAND / FULLSCREEN FEATURE ---
  let isExpanded = false;
  const expandBtn = document.createElement("button");
  expandBtn.id = "expandChatBtn";
  expandBtn.innerHTML = "⛶";
  expandBtn.title = "Expand chat";
  expandBtn.style.marginRight = "10px";
  expandBtn.style.fontSize = "16px";
  expandBtn.style.transition = "transform 0.2s ease";
  
  if (closeChat && closeChat.parentNode) {
    closeChat.parentNode.insertBefore(expandBtn, closeChat);
  } else {
    const chatHeader = chatContainer.querySelector('.chat-header');
    if (chatHeader) chatHeader.appendChild(expandBtn);
  }

  expandBtn.addEventListener("click", () => {
    isExpanded = !isExpanded;
    if (isExpanded) {
      chatContainer.classList.add("expanded");
      expandBtn.innerHTML = "⤢";
      expandBtn.title = "Collapse chat";
      if (window.innerWidth <= 768) document.body.style.overflow = "hidden"; // Prevent bg scrolling
    } else {
      chatContainer.classList.remove("expanded");
      expandBtn.innerHTML = "⛶";
      expandBtn.title = "Expand chat";
      document.body.style.overflow = "";
    }
    setTimeout(() => {
      messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: "smooth" });
    }, 310); // Wait for CSS transition
  });

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
      if (chatContainer.classList.contains("expanded")) {
        document.body.style.overflow = ""; // Clean up scroll lock if closed while expanded
      }
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

    // FIX: Remove empty placeholder when a real message arrives
    const emptyPlaceholder = messagesDiv.querySelector(".empty-chat-state");
    if (emptyPlaceholder) {
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

    if (msg.file_url) {
      if (msg.file_type && msg.file_type.startsWith('image/')) {
        const img = document.createElement('img');
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.marginBottom = msg.message ? '8px' : '4px';
        img.style.cursor = 'pointer';
        div.appendChild(img);

        if (msg.file_url.startsWith('http')) {
          img.src = msg.file_url;
          img.onclick = () => window.open(msg.file_url, '_blank');
        } else {
          img.alt = 'Loading image...';
          supabase.storage.from('chat-files').createSignedUrl(msg.file_url, 3600).then(({data}) => {
            if (data && data.signedUrl) {
              img.src = data.signedUrl;
              img.onclick = () => window.open(data.signedUrl, '_blank');
            } else {
              img.alt = 'Image not available';
            }
          });
        }
      } else {
        const fileCard = document.createElement('div');
        fileCard.style.display = 'flex';
        fileCard.style.alignItems = 'center';
        fileCard.style.gap = '8px';
        fileCard.style.padding = '8px';
        fileCard.style.background = isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        fileCard.style.borderRadius = '6px';
        fileCard.style.marginBottom = msg.message ? '8px' : '4px';

        const fileIcon = document.createElement('span');
        fileIcon.textContent = '📄';
        fileCard.appendChild(fileIcon);

        const fileNameSpan = document.createElement('span');
        fileNameSpan.textContent = msg.file_name || 'Download File';
        fileNameSpan.style.flex = '1';
        fileNameSpan.style.wordBreak = 'break-all';
        fileNameSpan.style.fontSize = '0.85rem';
        fileCard.appendChild(fileNameSpan);

        const downloadBtn = document.createElement('a');
        downloadBtn.textContent = 'Download';
        downloadBtn.style.color = isUser ? '#fff' : '#007bff';
        downloadBtn.style.textDecoration = 'none';
        downloadBtn.style.fontWeight = 'bold';
        downloadBtn.style.fontSize = '0.8rem';
        downloadBtn.style.cursor = 'pointer';
        fileCard.appendChild(downloadBtn);
        div.appendChild(fileCard);

        if (msg.file_url.startsWith('http')) {
          downloadBtn.href = msg.file_url;
          downloadBtn.target = "_blank";
          downloadBtn.setAttribute('download', msg.file_name || 'download');
        } else {
          supabase.storage.from('chat-files').createSignedUrl(msg.file_url, 3600).then(({data}) => {
            if (data && data.signedUrl) {
              downloadBtn.href = data.signedUrl;
              downloadBtn.target = "_blank";
              downloadBtn.setAttribute('download', msg.file_name || 'download');
            }
          });
        }
      }
    }

    if (msg.message) {
      const content = document.createElement("span");
      content.textContent = msg.message;
      div.appendChild(content);
    }

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
        messagesDiv.innerHTML = `<p class="empty-chat-state">24hrs Active Support</p>`;
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
    if (!text && !selectedFile) return;

    // FIX: Disable inputs while sending to prevent rapid double-submissions
    sendBtn.disabled = true;
    input.disabled = true;
    if (attachBtn) attachBtn.disabled = true;
    sendBtn.style.opacity = '0.5';

    let fileUrl = null;
    let fileType = null;
    let fileName = null;

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${uniqueFileName}`;
        
        const { data, error } = await supabase.storage
          .from('chat-files')
          .upload(filePath, selectedFile);

        if (error) throw error;

        fileUrl = filePath;
        fileType = selectedFile.type;
        fileName = selectedFile.name;
      }

      const { error } = await supabase
        .from("messages")
        .insert([{
          user_id: userId,
          sender: "user",
          message: text,
          is_read: false,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName
        }]);

      if (error) throw error;

      input.value = "";
      selectedFile = null;
      if (fileInput) fileInput.value = "";
      if (fileIndicator) fileIndicator.style.display = "none";
    } catch (err) {
      console.error("Send message error:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      // Restore inputs regardless of success or failure
      sendBtn.disabled = false;
      input.disabled = false;
      if (attachBtn) attachBtn.disabled = false;
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