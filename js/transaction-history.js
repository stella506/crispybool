import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', async () => {

  // -------------------------------
  // SUPABASE SETUP
  // -------------------------------
  
  // --- INJECT MODERN UI STYLES ---
  const txStyles = document.createElement('style');
  txStyles.textContent = `
    /* TX HISTORY UI ENHANCEMENTS */
    .tx-controls {
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tx-search-input {
      width: 100%;
      padding: 14px 18px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px;
      font-size: 0.95rem;
      background: var(--card-bg, #ffffff);
      color: var(--text-primary, #0f172a);
      transition: all 0.3s ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    }
    .tx-search-input:focus {
      outline: none;
      border-color: var(--primary, #1e3a5f);
      box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
    }
    .tx-list-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .tx-card {
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 14px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
    }
    .tx-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      border-color: #cbd5e1;
    }
    .tx-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border, #f1f5f9);
      padding-bottom: 16px;
    }
    .tx-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .tx-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      background: #f1f5f9;
      border-radius: 10px;
      font-size: 1.2rem;
    }
    .tx-icon.type-deposit { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .tx-icon.type-withdraw { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .tx-icon.type-bonus { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
    
    .tx-type-name {
      font-weight: 700;
      font-size: 1.15rem;
      color: var(--text-primary, #0f172a);
    }
    .tx-status-badge {
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-success { background: rgba(16, 185, 129, 0.15); color: #059669; }
    .status-failed { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
    .status-pending { background: rgba(245, 158, 11, 0.15); color: #d97706; }
    
    .tx-card-body {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px 24px;
    }
    .tx-info-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .tx-info-group.full-width { grid-column: 1 / -1; }
    
    .tx-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tx-value {
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-primary, #0f172a);
      word-break: break-word;
    }
    .tx-amount-val {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary, #1e3a5f);
    }
    .tx-hash {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: inline-block;
      width: fit-content;
      max-width: 100%;
      overflow-x: auto;
    }
    
    .tx-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      background: var(--card-bg, #ffffff);
      border: 2px dashed var(--border, #cbd5e1);
      border-radius: 16px;
      color: var(--text-secondary, #64748b);
    }
    .tx-empty-icon {
      font-size: 3.5rem;
      margin-bottom: 16px;
      opacity: 0.9;
    }
    .tx-empty-state h3 {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin-bottom: 8px;
    }
    .tx-empty-state p {
      font-size: 1rem;
      max-width: 320px;
      line-height: 1.5;
    }
    .error-state {
      border-color: #fca5a5;
      background: #fef2f2;
    }
    .error-state h3 { color: #dc2626; }
    
    @media (max-width: 640px) {
      .tx-card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      .tx-status-badge { align-self: flex-start; }
      .tx-card-body { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(txStyles);

  const transactionListEl = document.getElementById('transactionHistoryList');
  const logoutBtn = document.getElementById('logoutBtn');

  // Reset container constraints to allow the new card UI to breathe properly
  if (transactionListEl) {
    transactionListEl.style.maxHeight = 'none';
    transactionListEl.style.border = 'none';
    transactionListEl.style.background = 'transparent';
    transactionListEl.style.padding = '0';
    transactionListEl.style.overflow = 'visible';
  }

  // -------------------------------
  // AUTH
  // -------------------------------
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    window.location.replace('login.html');
    return;
  }

  const user = userData.user;

  // -------------------------------
  // HELPERS
  // -------------------------------
  const formatCurrency = amount => '$' + Number(amount).toFixed(2);
  const formatDate = timestamp =>
    timestamp ? new Date(timestamp).toLocaleString() : 'N/A';

  // -------------------------------
  // FETCH
  // -------------------------------
  async function fetchTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log("Fetched transactions:", data);
    console.log("Fetch error:", error);

    if (error) {
      transactionListEl.innerHTML = `
        <div class="tx-empty-state error-state">
          <div class="tx-empty-icon">⚠️</div>
          <h3>Failed to load history</h3>
          <p>Please check your connection and try refreshing the page.</p>
        </div>
      `;
      return;
    }

    if (!data || data.length === 0) {
      transactionListEl.innerHTML = `
        <div class="tx-empty-state">
          <div class="tx-empty-icon">📄</div>
          <h3>No transactions yet</h3>
          <p>Your transaction history will appear here once you make your first deposit or withdrawal.</p>
        </div>
      `;
      return;
    }

    renderTransactions(data);
  }

  // -------------------------------
  // RENDER
  // -------------------------------
  function renderTransactions(transactions) {
    transactionListEl.innerHTML = '';

    // Inject Search/Filter Controls
    const controlsHtml = `
      <div class="tx-controls">
        <input type="text" id="txFilterInput" class="tx-search-input" placeholder="Search by type, status, or method..." autocomplete="off" />
      </div>
      <div class="tx-list-container" id="txCardsContainer"></div>
    `;
    transactionListEl.innerHTML = controlsHtml;

    const txCardsContainer = document.getElementById('txCardsContainer');

    transactions.forEach(tx => {
      let statusClass = 'status-pending';
      let statusText = tx.status || 'Pending';
      
      // Determine Status Badges
      const s = statusText.toLowerCase();
      if (s.includes('success')) statusClass = 'status-success';
      else if (s.includes('fail') || s.includes('cancel') || s.includes('reject')) statusClass = 'status-failed';
      else if (s.includes('pending')) statusClass = 'status-pending';

      // Determine Transaction Type Icon
      const typeStr = (tx.type || '').toLowerCase();
      let iconHtml = '<span class="tx-icon default-icon">💳</span>';
      if (typeStr.includes('deposit')) {
          iconHtml = '<span class="tx-icon type-deposit">⬇️</span>';
      } else if (typeStr.includes('withdraw')) {
          iconHtml = '<span class="tx-icon type-withdraw">⬆️</span>';
      } else if (typeStr.includes('bonus') || typeStr.includes('referral')) {
          iconHtml = '<span class="tx-icon type-bonus">🎁</span>';
      }

      // Build the Card
      const txEl = document.createElement('div');
      txEl.className = 'tx-card';

      txEl.innerHTML = `
        <div class="tx-card-header">
          <div class="tx-title">
            ${iconHtml}
            <span class="tx-type-name">${tx.type || 'Transaction'}</span>
          </div>
          <div class="tx-status-badge ${statusClass}">${statusText}</div>
        </div>
        <div class="tx-card-body">
          <div class="tx-info-group">
            <span class="tx-label">Amount</span>
            <span class="tx-value tx-amount-val">${formatCurrency(tx.amount)}</span>
          </div>
          <div class="tx-info-group">
            <span class="tx-label">Date & Time</span>
            <span class="tx-value">${formatDate(tx.created_at)}</span>
          </div>
          <div class="tx-info-group">
            <span class="tx-label">Method</span>
            <span class="tx-value">${tx.method || 'N/A'}</span>
          </div>
          ${tx.address ? `
          <div class="tx-info-group full-width">
            <span class="tx-label">Wallet / Address</span>
            <span class="tx-value tx-hash">${tx.address}</span>
          </div>` : ''}
          ${tx.tx_id ? `
          <div class="tx-info-group full-width">
            <span class="tx-label">Transaction ID</span>
            <span class="tx-value tx-hash">${tx.tx_id}</span>
          </div>` : ''}
        </div>
      `;

      txCardsContainer.appendChild(txEl);
    });

    // Connect UI-Only Search Filter
    const filterInput = document.getElementById('txFilterInput');
    filterInput?.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const cards = txCardsContainer.querySelectorAll('.tx-card');
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'flex' : 'none';
      });
    });
  }

  // -------------------------------
  // INIT
  // -------------------------------
  await fetchTransactions();

  // -------------------------------
  // LOGOUT
  // -------------------------------
  logoutBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });

});