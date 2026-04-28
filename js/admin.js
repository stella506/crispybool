
import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', async () => {

  // Inject professional admin styles
  const adminStyles = document.createElement("style");
  adminStyles.textContent = `
    :root {
      --admin-bg: #f9fafb;
      --panel-bg: #ffffff;
      --border-color: #e5e7eb;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --accent-blue: #3b82f6;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-yellow: #f59e0b;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .stat-card {
      background-color: var(--panel-bg);
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
    }
    .stat-card h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 8px 0;
    }
    .stat-card p {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .admin-main-grid {
      display: grid;
      grid-template-columns: 65% 35%;
      gap: 24px;
      align-items: start;
    }
    .transactions-panel {
      background-color: var(--panel-bg);
      border-radius: 12px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
      overflow: hidden;
    }
    .transactions-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .transactions-header h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
    .filters {
      display: flex;
      gap: 16px;
      padding: 16px 20px;
      flex-wrap: wrap;
    }
    .filters input, .filters select {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background-color: var(--panel-bg);
    }
    .filters input:focus, .filters select:focus {
      outline: 2px solid var(--accent-blue);
      border-color: var(--accent-blue);
    }
    .transactions-table-container {
      overflow-x: auto;
    }
    .transactions-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .transactions-table th, .transactions-table td {
      padding: 12px 20px;
      font-size: 14px;
      white-space: nowrap;
    }
      
    .transactions-table thead { background-color: #f9fafb; }
    .transactions-table th { font-weight: 600; color: var(--text-secondary); }
    .transactions-table tbody tr { border-top: 1px solid var(--border-color); }
    .transactions-table tbody tr:hover { background-color: #f9fafb; }
    .address-col {
      min-width: 320px; /* Provides ample space for full crypto addresses */
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; /* Monospace for easier reading of hashes */
    }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.success { background-color: #d1fae5; color: #065f46; }
    .status-badge.failed { background-color: #fee2e2; color: #991b1b; }
    .status-badge.pending { background-color: #fef3c7; color: #92400e; }
    .action-buttons .btn {
      border: none;
      background: none;
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
    }
    .action-buttons .btn.approve { color: var(--accent-green); }
    .action-buttons .btn.reject { color: var(--accent-red); }
    .chat-panel {
      display: flex;
      flex-direction: column;
      background-color: var(--panel-bg);
      border-radius: 12px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
      height: 75vh;
      max-height: 800px;
    }
    .chat-interface {
      display: flex;
      flex-grow: 1;
      overflow: hidden;
    }
    .user-list-container {
      width: 220px;
      border-right: 1px solid var(--border-color);
      overflow-y: auto;
      background-color: #f9fafb;
    }
    .user-list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
      font-size: 14px;
    }
    .user-list-item:hover { background-color: #f3f4f6; }
    .user-list-item.selected { background-color: var(--accent-blue); color: white; }
    .user-email { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .unread-badge {
      background-color: var(--accent-red);
      color: white;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 600;
      min-width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
    }
    .chat-area { flex: 1; display: flex; flex-direction: column; }
    .chat-header { padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-weight: 600; }
    .messages-container { flex-grow: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .message-bubble { padding: 10px 14px; border-radius: 16px; max-width: 75%; word-break: break-word; line-height: 1.5; }
    .message-bubble.admin { background-color: var(--accent-blue); color: white; border-bottom-right-radius: 4px; align-self: flex-end; }
    .message-bubble.user { background-color: #e5e7eb; color: var(--text-primary); border-bottom-left-radius: 4px; align-self: flex-start; }
    .admin-reply-form { display: flex; padding: 12px; border-top: 1px solid var(--border-color); gap: 10px; }
    #adminReplyInput { flex-grow: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 12px; font-size: 14px; }
    #adminReplyInput:focus { outline: 2px solid var(--accent-blue); border-color: var(--accent-blue); }
    #adminSendBtn { padding: 8px 16px; border: none; background-color: var(--accent-blue); color: white; border-radius: 6px; cursor: pointer; font-weight: 600; }
    #adminSendBtn:hover { background-color: #2563eb; }
    @media (max-width: 1200px) {
      .admin-main-grid { grid-template-columns: 1fr; }
      .chat-panel { height: 80vh; }
    }
    @media (max-width: 768px) {
      .filters { flex-direction: column; align-items: stretch; }
      .chat-interface { flex-direction: column; }
      .user-list-container { 
        width: 100%; 
        max-height: 65px; /* Compact user list to give chat area more room */
        border-right: none; 
        border-bottom: 1px solid var(--border-color); 
        display: flex; 
        flex-direction: row; /* Force horizontal alignment */
        overflow-x: auto; 
        overflow-y: hidden; 
        -webkit-overflow-scrolling: touch; /* Smooth horizontal scroll on iOS */
      }
      .user-list-item { border-bottom: none; border-right: 1px solid var(--border-color); white-space: nowrap; flex-shrink: 0; /* Prevents items from squishing together */ }
      .chat-panel { height: 75vh; min-height: 450px; }
      .message-bubble { max-width: 90%; font-size: 14px; } /* Expand bubbles for narrower screens */
      #adminReplyInput { font-size: 16px; /* Prevents auto-zoom on mobile iOS Safari */ }
    }
  `;
  document.head.appendChild(adminStyles);

  /* =========================
     SUPABASE INIT
  ========================== */
 
  /* =========================
     DOM ELEMENTS
  ========================== */
  const tableBody = document.getElementById('tableBody');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');

  const totalCount = document.getElementById('totalCount');
  const pendingCount = document.getElementById('pendingCount');
  const successCount = document.getElementById('successCount');
  const failedCount = document.getElementById('failedCount');

  // Chat elements
  const userListDiv = document.getElementById("userList");
  const adminMessagesDiv = document.getElementById("adminMessages");
  const adminInput = document.getElementById("adminReplyInput");
  const adminSendBtn = document.getElementById("adminSendBtn");
  const chatUserTitle = document.getElementById("chatUserTitle");

  let allData = [];
  let selectedUserId = null;

  /* =========================
     AUTH CHECK
  ========================== */
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const user = session.user;

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    alert('Access denied');
    window.location.href = 'dashboard.html';
    return;
  }

  /* =========================
     LOGOUT
  ========================== */
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });

  /* =========================
     TRANSACTION SYSTEM
  ========================== */
  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          status,
          method,
          address,
          plan,
          contract_duration,
          created_at,
          user_id,
          profiles!transactions_user_id_fkey (
            email,
            balance,
            profit_balance
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      allData = data || [];
      updateStats();
      renderTransactions(allData);

    } catch (err) {
      console.error('Fetch error:', err);
      alert('Failed to fetch transactions');
    }
  }

  function updateStats() {
    totalCount.textContent = allData.length;
    pendingCount.textContent = allData.filter(x => x.status === 'Pending').length;
    successCount.textContent = allData.filter(x => x.status === 'Successful').length;
    failedCount.textContent = allData.filter(x => x.status === 'Failed').length;
  }

  function formatDuration(val) {
    if (!val) return 'N/A';
    const v = val.toLowerCase();
    if (v === 'daily') return 'Daily';
    if (v === 'weekly') return 'Weekly';
    if (v === 'monthly') return 'Monthly';
    return 'N/A';
  }

  function renderTransactions(data) {
    // Dynamically add the new column header if it doesn't exist yet to preserve HTML UI
    const theadRow = document.querySelector('.transactions-table thead tr');
    if (theadRow && !theadRow.dataset.durationAdded) {
      const th = document.createElement('th');
      th.textContent = 'Contract Duration';
      if (theadRow.children.length > 4) {
        theadRow.insertBefore(th, theadRow.children[4]);
      } else {
        theadRow.appendChild(th);
      }
      theadRow.dataset.durationAdded = 'true';
    }

    tableBody.innerHTML = '';

    if (!data.length) {
      tableBody.innerHTML = `<tr><td colspan="10">No transactions</td></tr>`;
      return;
    }

    data.forEach(tx => {
      const email = tx.profiles?.email || '⚠️ Missing';
      const statusClass = tx.status ? tx.status.toLowerCase() : 'pending';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label="Email">${email}</td>
        <td data-label="Type">${tx.type}</td>
        <td data-label="Amount">$${Number(tx.amount).toFixed(2)}</td>
        <td data-label="Plan">${tx.plan || '-'}</td>
        <td data-label="Duration">${formatDuration(tx.contract_duration)}</td>
        <td data-label="Method">${tx.method || '-'}</td>
        <td data-label="Address" class="address-col" title="${tx.address || ''}">${tx.address || '-'}</td>
        <td data-label="Status"><span class="status-badge ${statusClass}">${tx.status}</span></td>
        <td data-label="Date">${new Date(tx.created_at).toLocaleString()}</td>
        <td data-label="Action" class="action-buttons">
          ${
            tx.status === 'Pending'
              ? `<button class="btn approve" title="Approve" onclick="approve('${tx.id}')">✔</button><button class="btn reject" title="Reject" onclick="reject('${tx.id}')">✖</button>`
              : '-'
          }
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  function applyFilters() {
    const search = searchInput.value.toLowerCase();
    const status = statusFilter.value;

    let filtered = [...allData];
    if (search) {
      filtered = filtered.filter(tx =>
        (tx.profiles?.email || '').toLowerCase().includes(search) ||
        (tx.type || '').toLowerCase().includes(search) ||
        (tx.method || '').toLowerCase().includes(search)
      );
    }
    if (status !== 'all') filtered = filtered.filter(tx => tx.status === status);
    renderTransactions(filtered);
  }

  searchInput?.addEventListener('input', applyFilters);
  statusFilter?.addEventListener('change', applyFilters);

  window.approve = async (id) => {
    try {
      const { data: tx } = await supabase
        .from('transactions')
        .select(`*, profiles!transactions_user_id_fkey (balance, profit_balance)`)
        .eq('id', id)
        .single();

      if (!tx || tx.status !== 'Pending') return;

      let balance = tx.profiles.balance || 0;
      let profit = tx.profiles.profit_balance || 0;
      let updateData = {};

      if (tx.type.toLowerCase().includes('deposit')) {
        // Calculate profit based on plan using updated ROI percentages
        const planRates = {
          basic: 0.065,     // 6.5%
          standard: 0.145,  // 14.5%
          advance: 0.215,   // 21.5% (Matches frontend deposit.js value)
          advanced: 0.215,  // 21.5% (Alias for safety)
          premium: 0.285    // 28.5%
        };

        // Safely normalize plan name to lowercase to prevent case-sensitivity issues
        const normalizedPlan = (tx.plan || '').toLowerCase().trim();

        // Get correct rate or default to 0 (fail-safe) if unrecognized
        const profitPercentage = planRates[normalizedPlan] || 0;

        updateData.balance = balance + tx.amount;
        updateData.profit_balance = profit + (tx.amount * profitPercentage);
      } else if (tx.type.toLowerCase().includes('withdrawal')) {
        if (tx.type.toLowerCase().includes('profit')) {
          if (profit < tx.amount) throw new Error('Insufficient profit balance');
          updateData.balance = balance;
          updateData.profit_balance = profit - tx.amount;
        } else {
          if (balance < tx.amount) throw new Error('Insufficient balance');
          updateData.balance = balance - tx.amount;
          updateData.profit_balance = profit;
        }
      }

      await supabase.from('transactions').update({ status: 'Successful' }).eq('id', id);
      await supabase.from('profiles').update(updateData).eq('id', tx.user_id);
      fetchTransactions();

    } catch (err) {
      console.error(err);
      alert(err.message || 'Transaction failed');
    }
  };

  window.reject = async (id) => {
    await supabase.from('transactions').update({ status: 'Failed' }).eq('id', id);
    fetchTransactions();
  };

  /* =========================
     ADMIN CHAT SYSTEM
  ========================== */

  async function loadUsers() {
    if (!userListDiv) return;

    const { data, error } = await supabase
      .from("messages")
      .select("user_id, sender, is_read, profiles(email)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("User fetch error:", error);
      return;
    }

    const uniqueUsers = {};
    data.forEach(msg => {
      if (!uniqueUsers[msg.user_id]) uniqueUsers[msg.user_id] = { ...msg, unreadCount: 0 };
      if (msg.sender === "user" && msg.is_read === false) uniqueUsers[msg.user_id].unreadCount++;
    });

    userListDiv.innerHTML = "";

    Object.values(uniqueUsers).forEach(user => {
      const div = document.createElement("div");
      div.className = "user-list-item";
      div.dataset.userId = user.user_id;

      const label = document.createElement("span");
      label.className = "user-email";
      label.textContent = user.profiles?.email || user.user_id;

      const badge = document.createElement("span");
      badge.className = "unread-badge";
      badge.textContent = user.unreadCount;
      if (user.unreadCount === 0) {
        badge.style.display = "none";
      }

      div.appendChild(label);
      div.appendChild(badge);

      div.onclick = () => selectUser(user.user_id, label.textContent, badge);
      userListDiv.appendChild(div);
    });
  }

  async function selectUser(userId, label, badge) {
    selectedUserId = userId;
    if (chatUserTitle) chatUserTitle.textContent = `Chat with ${label}`;

    await loadMessages(userId);
    await markMessagesRead(userId);
    if (badge) {
      badge.textContent = "0"; // Explicitly reset count
      badge.style.display = "none"; // Guarantee removal from view
    }

    // Highlight selected user
    document.querySelectorAll('.user-list-item').forEach(item => {
      item.classList.remove('selected');
    });
    document.querySelector(`.user-list-item[data-user-id="${userId}"]`)?.classList.add('selected');
  }

  async function loadMessages(userId) {
    if (!adminMessagesDiv) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Message load error:", error);
      return;
    }

    adminMessagesDiv.innerHTML = "";
    data.forEach(msg => {
      const div = document.createElement("div");
      div.className = `message-bubble ${msg.sender}`;
      div.textContent = msg.message;

      adminMessagesDiv.appendChild(div);
    });

    adminMessagesDiv.scrollTop = adminMessagesDiv.scrollHeight;
  }

  async function markMessagesRead(userId) {
    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("sender", "user")
        .eq("is_read", false);
    } catch (err) {
      console.error("Mark messages read error:", err);
    }
  }

  async function sendReply() {
    const text = adminInput?.value.trim();
    if (!text || !selectedUserId) return;

    const { error } = await supabase
      .from("messages")
      .insert([{ user_id: selectedUserId, sender: "admin", message: text, is_read: false }]);

    if (error) {
      console.error("Reply error:", error);
      return;
    }

    adminInput.value = "";
    await loadMessages(selectedUserId);
    await loadUsers();
  }

  adminSendBtn?.addEventListener("click", sendReply);
  adminInput?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); sendReply(); } });

  /* =========================
     REALTIME UPDATES
  ========================== */
  supabase
    .channel("admin-chat")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async payload => {
        const msg = payload.new;
        if (msg.user_id === selectedUserId) {
          await loadMessages(selectedUserId);
          await markMessagesRead(selectedUserId);
        }
        await loadUsers();
      }
    )
    .subscribe();

  /* =========================
     INIT
  ========================== */
  fetchTransactions();
  loadUsers();

});