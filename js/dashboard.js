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
      await fetchDashboardData();

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

  function generateReferralLink(username) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/crispybool/index.html?ref=${username}`;
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

      // 5️⃣ UPDATE UI
      updateDashboardUI(profile);

    } catch (err) {
      console.error('Dashboard error:', err);
    }
  }

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