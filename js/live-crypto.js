
const coins = ["bitcoin", "ethereum", "tether", "binancecoin", "solana", "dogecoin", "notcoin", "ton", "xrp" ];
let globalCryptoData = [];
let currentFilter = 'all';
let searchQuery = '';
let showAll = false;
const INITIAL_LIMIT = 4;
let searchTimeout;

function injectControls() {
  const section = document.querySelector('.crypto-section');
  if (!section || document.getElementById('crypto-controls')) return;

  const controlsHtml = `
    <div id="crypto-controls" class="crypto-controls">
      <div class="crypto-filters">
        <button class="filter-btn active" data-filter="all">Top Coins</button>
        <button class="filter-btn" data-filter="gainers">Gainers</button>
        <button class="filter-btn" data-filter="losers">Losers</button>
      </div>
      <input type="text" id="cryptoSearch" class="crypto-search" placeholder="Search tokens..." />
    </div>
  `;
  const lastUpdated = document.getElementById('crypto-last-updated');
  if (lastUpdated) {
    lastUpdated.insertAdjacentHTML('beforebegin', controlsHtml);
  }

  const container = document.getElementById('crypto-container');
  if (container) {
    const actionsHtml = `
      <div class="crypto-actions">
        <button id="cryptoShowMore" class="crypto-show-more-btn" style="display: none; color: white;">View More</button>
      </div>
    `;
    container.insertAdjacentHTML('afterend', actionsHtml);
  }

  // Setup Filter Events
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      showAll = false; // Reset to collapsed view on filter change
      renderCryptoCards();
    });
  });

  // Setup Debounced Search Event
  const searchInput = document.getElementById('cryptoSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value.trim();
        renderCryptoCards();
      }, 300);
    });
  }

  // Setup View More Event
  const showMoreBtn = document.getElementById('cryptoShowMore');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      showAll = !showAll;
      renderCryptoCards();
    });
  }
}

function renderCryptoCards() {
  const container = document.getElementById("crypto-container");
  const showMoreBtn = document.getElementById("cryptoShowMore");
  if (!container) return;

  let filtered = globalCryptoData.filter(coin => {
    if (searchQuery && !coin.name.toLowerCase().includes(searchQuery.toLowerCase()) && !coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (currentFilter === 'gainers' && coin.price_change_percentage_24h < 0) return false;
    if (currentFilter === 'losers' && coin.price_change_percentage_24h >= 0) return false;
    return true;
  });

  if (showMoreBtn) {
    if (filtered.length <= INITIAL_LIMIT) {
      showMoreBtn.style.display = 'none';
    } else {
      showMoreBtn.style.display = 'inline-block';
      showMoreBtn.textContent = showAll ? 'Show Less' : 'View More';
    }
  }

  const displayData = showAll ? filtered : filtered.slice(0, INITIAL_LIMIT);
  container.innerHTML = "";

  if (displayData.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #64748b;">No tokens found matching your criteria.</div>`;
    return;
  }

  displayData.forEach(coin => {
    const changeClass = coin.price_change_percentage_24h >= 0 ? "green" : "red";
    const changeIcon = coin.price_change_percentage_24h >= 0 ? "↗" : "↘";
    const marketCap = coin.market_cap ? `$${(coin.market_cap / 1000000000).toFixed(1)}B` : "N/A";

    container.innerHTML += `
      <div class="crypto-card">
        <div class="crypto-rank">#${coin.market_cap_rank || "N/A"}</div>
        <div class="crypto-top">
          <img src="${coin.image}" alt="${coin.name}" loading="lazy" />
          <span class="crypto-name">${coin.name}</span>
        </div>
        <div class="crypto-price">$${coin.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</div>
        <div class="crypto-change ${changeClass}">
          ${changeIcon} ${Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
        </div>
        <div class="crypto-market-cap">Market Cap: ${marketCap}</div>
      </div>
    `;
  });
}

async function loadCrypto() {
  try {
    const container = document.getElementById("crypto-container");
    const lastUpdated = document.getElementById("crypto-last-updated");

    injectControls();

    if (globalCryptoData.length === 0) {
      container.innerHTML = "";
      lastUpdated.textContent = "Last updated: Loading...";
      for (let i = 0; i < INITIAL_LIMIT; i++) {
        container.innerHTML += `
          <div class="crypto-card loading">
            <div class="crypto-top">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.1);"></div>
              <div style="height: 16px; width: 80px; background: rgba(255,255,255,0.1); border-radius: 4px;"></div>
            </div>
            <div style="height: 24px; width: 120px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 8px 0;"></div>
            <div style="height: 20px; width: 60px; background: rgba(255,255,255,0.1); border-radius: 10px;"></div>
          </div>
        `;
      }
    }

    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coins.join(",")}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`
    );

    const data = await res.json();
    globalCryptoData = data;

    renderCryptoCards();

    // Update last updated timestamp
    const now = new Date();
    lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;

  } catch (error) {
    console.error("Error fetching crypto:", error);
    const container = document.getElementById("crypto-container");
    const lastUpdated = document.getElementById("crypto-last-updated");

    container.innerHTML = `
      <div class="crypto-card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <div style="color: #ef4444; font-size: 1.2rem; margin-bottom: 10px;">⚠️ Unable to load crypto data</div>
        <div style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Please check your internet connection and try again.</div>
      </div>
    `;
    lastUpdated.textContent = "Last updated: Error loading data";
  }
}

// Load immediately
loadCrypto();

// Refresh every 30 seconds
setInterval(loadCrypto, 30000);
