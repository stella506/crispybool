import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', async function () {
  // --- SUPABASE SETUP ---
  

  // --- FAST AUTH CHECK ---
  const localSession = localStorage.getItem('supabase_session');
  if (!localSession) {
    window.location.replace('login.html');
    return;
  }

  // --- ELEMENTS ---
  const userDisplay = document.getElementById('usernameDisplay');
  const balanceValue = document.getElementById('balanceValue');
  const profitValue = document.getElementById('profitBalanceValue');
  const bonusValue = document.getElementById('bonusBalanceValue');
  const transactionHistory = document.getElementById('transactionHistory');

  const depositBtn = document.getElementById('depositBtn');
  const withdrawBtn = document.getElementById('withdrawBtn');
  const accountSettingsBtn = document.getElementById('accountSettingsBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const referralCodeInput = document.getElementById('referralCodeInput');
  const copyReferralBtn = document.getElementById('copyReferralBtn');

  const referralListContainer = document.getElementById('referralList');
  const referralCountBadge = document.getElementById('referralCountBadge');

  let currentUser = null;
  let currentProfitBalance = 0;

  // --- PROFIT TRANSFER CARD & MODAL SETUP ---
  
  // 1. Create Standalone Trigger Card
  const transferCard = document.createElement('div');
  transferCard.className = 'card transfer-profit-card';
  transferCard.style.cssText = 'cursor: pointer; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;';
  transferCard.innerHTML = `
    <div>
      <h3 style="margin: 0 0 8px; font-size: 1.15rem; color: var(--primary, #1e3a5f);">Transfer Profit</h3>
      <p style="margin: 0; color: var(--text-secondary, #64748b); font-size: 0.9rem;">Move your earnings securely to your main balance</p>
    </div>
    <button style="padding: 10px 20px; background: linear-gradient(135deg, #d1af7e 30%, #6a040f 100%); color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; pointer-events: none; white-space: nowrap;">Transfer Now</button>
  `;

  // STRICT PLACEMENT: Insert safely below the withdrawal card logic
  if (withdrawBtn) {
    const withdrawParent = withdrawBtn.closest('.card') || withdrawBtn.parentNode;
    if (withdrawParent && withdrawParent.parentNode) {
      withdrawParent.parentNode.insertBefore(transferCard, withdrawParent.nextSibling);
    }
  }

  // 2. Create Modal Overlay and Form
  const transferModal = document.createElement('div');
  transferModal.id = 'transferProfitModal';
  transferModal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; justify-content: center; align-items: center; backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.3s ease;';
  transferModal.innerHTML = `
    <div style="background: var(--card-bg, #ffffff); padding: 32px; border-radius: 16px; width: 90%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transform: scale(0.95); transition: transform 0.3s ease; position: relative;">
      <button id="closeTransferModal" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary, #64748b); padding: 4px; line-height: 1;">&times;</button>
      <h2 style="margin: 0 0 16px; color: var(--primary, #1e3a5f); font-size: 1.4rem;">Transfer Profit</h2>
      <p style="margin: 0 0 24px; color: var(--text-secondary, #64748b); font-size: 0.95rem;">
        Available Profit Balance: <strong id="modalProfitDisplay" style="color: var(--success, #10b981);">$0.00</strong>
      </p>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <input type="number" id="transferAmountInput" placeholder="Enter amount to transfer" min="0.01" step="0.01" style="width: 100%; padding: 14px 16px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 1rem; color: var(--text-primary, #0f172a); box-sizing: border-box; background: transparent;">
        <button id="submitTransferBtn" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #d1af7e 30%, #6a040f 100%); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 1rem; transition: opacity 0.2s;">Transfer to Balance</button>
      </div>
      <p id="transferMsg" style="margin: 16px 0 0; font-size: 0.9rem; font-weight: 500; display: none; text-align: center;"></p>
    </div>
  `;
  document.body.appendChild(transferModal);

  // 3. Modal Interactions & State Management
  function closeTransferModalHandler() {
    transferModal.style.opacity = '0';
    transferModal.querySelector('div').style.transform = 'scale(0.95)';
    setTimeout(() => transferModal.style.display = 'none', 300);
  }

  transferCard.addEventListener('click', () => {
    transferModal.style.display = 'flex';
    void transferModal.offsetWidth; // Trigger reflow for smooth animation
    transferModal.style.opacity = '1';
    transferModal.querySelector('div').style.transform = 'scale(1)';
    document.getElementById('transferAmountInput').value = '';
    document.getElementById('transferMsg').style.display = 'none';
  });

  document.getElementById('closeTransferModal').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTransferModalHandler();
  });

  transferModal.addEventListener('click', (e) => {
    if (e.target === transferModal) closeTransferModalHandler();
  });

  // 4. RPC Logic & Data Refresh
  document.getElementById('submitTransferBtn').addEventListener('click', async () => {
    const inputEl = document.getElementById('transferAmountInput');
    const msgEl = document.getElementById('transferMsg');
    const btn = document.getElementById('submitTransferBtn');
    const amount = parseFloat(inputEl.value);

    msgEl.style.display = 'none';

    // Strict Validation
    if (!amount || isNaN(amount) || amount <= 0) {
      msgEl.textContent = 'Please enter a valid amount greater than 0.';
      msgEl.style.color = 'var(--danger, #ef4444)';
      msgEl.style.display = 'block';
      return;
    }
    if (amount > currentProfitBalance) {
      msgEl.textContent = 'Amount exceeds available profit balance.';
      msgEl.style.color = 'var(--danger, #ef4444)';
      msgEl.style.display = 'block';
      return;
    }

    // Loading State
    btn.disabled = true;
    btn.textContent = 'Processing...';
    btn.style.opacity = '0.7';

    try {
      const { error } = await supabase.rpc('transfer_profit', { amount: amount });
      if (error) throw error;

      msgEl.textContent = 'Transfer successful!';
      msgEl.style.color = 'var(--success, #10b981)';
      msgEl.style.display = 'block';
      inputEl.value = '';

      // Refetch using pre-existing dashboard function seamlessly
      if (typeof window.refreshInvestments === 'function') {
        await window.refreshInvestments();
      } else {
        await fetchDashboardData();
      }

      // Wait briefly for users to see success message before closing modal
      setTimeout(closeTransferModalHandler, 1800);
    } catch (err) {
      console.error('Transfer Error:', err);
      msgEl.textContent = err.message || 'Transfer failed. Please try again.';
      msgEl.style.color = 'var(--danger, #ef4444)';
      msgEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Transfer to Balance';
      btn.style.opacity = '1';
    }
  });

  // --- HELPERS ---
  function formatCurrency(number) {
    return '$' + Number(number || 0).toFixed(2);
  }

  // Utility function to format numbers as USD currency
  const formatUSD = (amount) => {
    // Ensure amount is a valid number
    const value = Number(amount) || 0;
    // Format using international standard
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(value);
  };

  function generateReferralLink(username) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/crispybool/index.html?ref=${username}`;
  }

  // --- ACTIVE INVESTMENTS UI HELPERS & STYLES ---
  const calculateProgress = (start, end) => {
    const now = new Date();
    const total = new Date(end) - new Date(start);
    const elapsed = now - new Date(start);
    if (total <= 0) return 100;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const getTimeRemaining = (endDate) => {
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return 'Completed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} days left`;
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${hours} hrs left`;
  };

  // Inject modern styles for investment cards
  if (!document.getElementById('modern-investment-styles')) {
    const style = document.createElement('style');
    style.id = 'modern-investment-styles';
    style.innerHTML = `
      .modern-investment-card {
        border-radius: 16px;
        padding: 20px;
        background: linear-gradient(145deg, #1e293b, #0f172a);
        color: #ffffff;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        margin-bottom: 16px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .modern-investment-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.25);
      }
      .modern-inv-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding-bottom: 12px;
      }
      .modern-inv-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #f8fafc;
      }
      .modern-inv-status {
        color: #10b981;
        background: rgba(16, 185, 129, 0.2);
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
      }
      .modern-inv-body {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 12px;
      }
      .modern-inv-stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .modern-inv-stat-label {
        font-size: 0.75rem;
        color: #94a3b8;
        text-transform: uppercase;
      }
      .modern-inv-stat-value {
        font-size: 1rem;
        font-weight: 600;
        color: #f8fafc;
      }
      .modern-inv-stat-value.profit {
        color: #10b981;
      }
      .modern-inv-progress-container {
        margin-top: 4px;
      }
      .modern-inv-progress-bar {
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      .modern-inv-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #10b981);
        border-radius: 4px;
        transition: width 1s ease-in-out;
      }
      .modern-inv-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
        color: #94a3b8;
        flex-wrap: wrap;
        gap: 8px;
      }
      .modern-inv-countdown {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #eab308;
        font-weight: 600;
        background: rgba(234, 179, 8, 0.15);
        padding: 4px 8px;
        border-radius: 12px;
      }
      .modern-inv-empty {
        text-align: center;
        padding: 40px 20px;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 12px;
        color: #64748b;
        font-weight: 500;
      }
      /* --- RESPONSIVE FIXES FOR DASHBOARD COMPONENTS --- */
      .transaction-table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        width: 100%;
        margin-top: 12px;
        border-radius: 8px;
      }
      .transaction-table {
        width: 100%;
        min-width: 500px;
        border-collapse: collapse;
      }
      .transaction-table th {
        text-align: left;
        padding: 12px;
        background: rgba(0,0,0,0.02);
        color: var(--text-secondary, #64748b);
        font-size: 0.85rem;
        text-transform: uppercase;
      }
      .transaction-table td {
        padding: 12px;
        border-bottom: 1px solid var(--border, #e2e8f0);
        font-size: 0.9rem;
      }
      .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
      }
      .status-success .status-badge { background: rgba(16, 185, 129, 0.1); color: #10b981; }
      .status-pending .status-badge { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
      .status-failed .status-badge { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
      
      @media (max-width: 480px) {
        .modern-inv-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        .modern-inv-status {
          align-self: flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // --- FETCH DASHBOARD DATA ---
  async function fetchDashboardData() {
    try {
      // 1️⃣ AUTH USER
      if (!currentUser) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          localStorage.removeItem('supabase_session');
          window.location.replace('login.html');
          return;
        }
        currentUser = user;
      }

      // 2️⃣ PROFILE
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, balance, profit_balance, bonus_balance, email')
        .eq('id', currentUser.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        return;
      }

      // 3️⃣ TRANSACTIONS
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      profile.transactions = txError ? [] : transactions;
      profile.transactionError = !!txError;

      // 4️⃣ REFERRALS
      const { data: referrals, error: refError } = await supabase
        .from('profiles')
        .select('username, email, created_at')
        .eq('referred_by', profile.username)
        .order('created_at', { ascending: false });

      profile.referrals = refError ? [] : referrals;
      profile.referralError = !!refError;

      // 4.5️⃣ ACTIVE INVESTMENTS
      const { data: investments, error: invError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (invError) {
        console.error('Investments fetch error:', invError);
      } else {
        console.log('Fetched investments:', investments);
        console.log('Current user:', currentUser.id);
      }

      // Ensure completed investments are excluded
      const activeInvestments = (investments || []).filter(inv => (inv.status || '').toLowerCase() === 'active' && inv.completed !== true);
      profile.investments = invError ? [] : activeInvestments;
      profile.investmentError = !!invError;

      // 5️⃣ UPDATE UI
      updateDashboardUI(profile);

    } catch (err) {
      console.error('Dashboard error:', err);
    }
  }

  window.refreshInvestments = fetchDashboardData;

  // --- UPDATE UI ---
  function updateDashboardUI(data) {
    if (!data) return;

    // --- BASIC INFO ---
    userDisplay.textContent = data.username || 'User';
    balanceValue.textContent = formatCurrency(data.balance);
    profitValue.textContent = formatCurrency(data.profit_balance);
    if (bonusValue) bonusValue.textContent = formatCurrency(data.bonus_balance);

    // Keep modal state tracking synchronized
    currentProfitBalance = data.profit_balance || 0;
    const modalProfitDisplay = document.getElementById('modalProfitDisplay');
    if (modalProfitDisplay) modalProfitDisplay.textContent = formatCurrency(currentProfitBalance);

    // 🔥 --- REFERRAL LINK (UPDATED FEATURE) ---
    if (referralCodeInput) {
      const referralLink = generateReferralLink(data.username);
      referralCodeInput.value = referralLink;
    }

  
    if (transactionHistory) {
      if (data.transactionError) {
        transactionHistory.innerHTML = '<div class="history-empty">Failed to load transactions.</div>';
      } else if (!data.transactions.length) {
        transactionHistory.innerHTML = '<div class="history-empty">No transactions yet.</div>';
      } else {
        const html = data.transactions.map(tx => {
          const statusLower = (tx.status || '').toLowerCase().trim();
          let statusClass = 'status-pending';
          
          if (statusLower.includes('success')) {
            statusClass = 'status-success';
          } else if (statusLower.includes('fail') || statusLower.includes('cancel') || statusLower.includes('rejected')) {
            statusClass = 'status-failed';
          } else if (statusLower.includes('pending')) {
            statusClass = 'status-pending';
          }
          
          return `
            <tr class="transaction-row">
              <td class="tx-type">${tx.type}</td>
              <td class="tx-amount">$${Number(tx.amount).toFixed(2)}</td>
              <td class="tx-date">${new Date(tx.created_at).toLocaleDateString()}</td>
              <td class="tx-status ${statusClass}"><span class="status-badge">${tx.status}</span></td>
            </tr>
          `;
        }).join('');

        transactionHistory.innerHTML = `
          <div class="transaction-table-container">
            <table class="transaction-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${html}</tbody>
            </table>
          </div>
        `;
      }
    }

    // 🔥 --- ACTIVE INVESTMENTS ---
    const activeInvestmentsList = document.getElementById('activeInvestmentsList');
    const totalActiveInvestment = document.getElementById('totalActiveInvestment');

    if (activeInvestmentsList) {
      if (data.investmentError) {
        activeInvestmentsList.innerHTML = '<div class="modern-inv-empty" style="color: var(--danger);">Failed to load investments.</div>';
        if (totalActiveInvestment) totalActiveInvestment.textContent = '';
      } else if (!data.investments || data.investments.length === 0) {
        activeInvestmentsList.innerHTML = `
          <div class="modern-inv-empty">
            <p style="margin: 0;">No active investments yet</p>
          </div>
        `;
        if (totalActiveInvestment) totalActiveInvestment.textContent = '';
      } else {
        let totalAmount = 0;
        const invHtml = data.investments.map(inv => {
          const amt = Number(inv.amount || 0);
          totalAmount += amt;
          const amtStr = inv.amount == null ? 'Pending data...' : formatUSD(amt);
          
          const startDateObj = inv.start_date ? new Date(inv.start_date) : (inv.created_at ? new Date(inv.created_at) : new Date());
          const startDate = inv.start_date ? new Date(inv.start_date).toLocaleDateString() : (inv.created_at ? startDateObj.toLocaleDateString() : 'Pending data...');
          const planName = inv.plan ? inv.plan.toUpperCase() : 'UNKNOWN';
          const durationValue = inv.duration || inv.contract_duration || '0';
          const durationText = durationValue + ' days';
          const statusText = inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : 'Active';
          
          let durationDays = 0;
          const durStr = String(inv.duration || inv.contract_duration || '').toLowerCase();
          if (parseInt(durStr) > 0) durationDays = parseInt(durStr);
          else if (durStr.includes('daily')) durationDays = 1;
          else if (durStr.includes('weekly')) durationDays = 7;
          else if (durStr.includes('monthly')) durationDays = 30;

          let endDateObj;
          if (inv.end_date) {
            endDateObj = new Date(inv.end_date);
          } else if (durationDays > 0 && startDateObj) {
            endDateObj = new Date(startDateObj);
            endDateObj.setDate(startDateObj.getDate() + durationDays);
          } else {
            endDateObj = new Date(); // Fallback
          }
          const endDateStr = endDateObj.toLocaleDateString();
          
          const progress = calculateProgress(startDateObj, endDateObj);
          const timeRemaining = getTimeRemaining(endDateObj);
          const profitStr = inv.profit > 0 ? formatUSD(inv.profit) : '$0.00';
          
          return `
            <div class="modern-investment-card">
              <div class="modern-inv-header">
                <h3>${planName} PLAN</h3>
                <span class="modern-inv-status">${statusText}</span>
              </div>
              
              <div class="modern-inv-body">
                <div class="modern-inv-stat">
                  <span class="modern-inv-stat-label">Amount</span>
                  <span class="modern-inv-stat-value">${amtStr}</span>
                </div>
                <div class="modern-inv-stat">
                  <span class="modern-inv-stat-label">Profit</span>
                  <span class="modern-inv-stat-value profit">${profitStr}</span>
                </div>
                <div class="modern-inv-stat">
                  <span class="modern-inv-stat-label">Duration</span>
                  <span class="modern-inv-stat-value">${durationText}</span>
                </div>
              </div>

              <div class="modern-inv-progress-container">
                <div class="modern-inv-progress-bar">
                  <div class="modern-inv-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="modern-inv-footer">
                  <span>Start: ${startDate}</span>
                  <span class="modern-inv-countdown">⏱ ${timeRemaining}</span>
                  <span>End: ${endDateStr}</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
        activeInvestmentsList.innerHTML = invHtml;
        if (totalActiveInvestment) {
          totalActiveInvestment.textContent = `Total Active Investment: ${formatUSD(totalAmount)}`;
        }
      }
    }

    // 🔥 --- REFERRAL LIST ---
    if (referralListContainer) {
      if (data.referralError) {
        referralListContainer.innerHTML = '<p style="color:red;">Failed to load referrals.</p>';
        return;
      }

      const refs = data.referrals || [];

      // Update count
      if (referralCountBadge) {
        referralCountBadge.textContent = refs.length;
      }

      if (!refs.length) {
        referralListContainer.innerHTML = `
          <div class="referral-empty-state">
            <h3>No Referrals Yet</h3>
            <p>Share your referral link to start earning.</p>
          </div>
        `;
        return;
      }

      const avatarColors = ['avatar-green', 'avatar-blue', 'avatar-purple', 'avatar-orange'];

      referralListContainer.innerHTML = refs.map((user, index) => {
        const initials = user.username.substring(0, 2).toUpperCase();
        const avatarClass = avatarColors[index % avatarColors.length];
        const joinDate = new Date(user.created_at).toLocaleDateString();

        return `
          <div class="referral-item">
            <div class="referral-avatar ${avatarClass}">${initials}</div>
            <div>
              <strong>${user.username}</strong><br>
              <small>${user.email}</small><br>
              <small>Joined: ${joinDate}</small>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // --- COPY REFERRAL LINK ---
  copyReferralBtn?.addEventListener('click', () => {
    if (!referralCodeInput.value) return;

    navigator.clipboard.writeText(referralCodeInput.value)
      .then(() => {
        copyReferralBtn.textContent = 'Copied!';
        setTimeout(() => copyReferralBtn.textContent = 'Copy', 2000);
      })
      .catch(err => console.error('Copy failed:', err));
  });

  // --- LOGOUT ---
  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase_session');
    window.location.replace('login.html');
  });

  // --- NAVIGATION ---
  depositBtn?.addEventListener('click', () => window.location.href = 'deposit.html');
  withdrawBtn?.addEventListener('click', () => window.location.href = 'withdrawal.html');
  accountSettingsBtn?.addEventListener('click', () => window.location.href = 'account-settings.html');

  // --- AUTO REFRESH ---
  setInterval(fetchDashboardData, 5000);

  // --- INIT ---
  fetchDashboardData();
});