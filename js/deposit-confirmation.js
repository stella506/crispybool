import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', () => {
    const depositDetailsContainer = document.getElementById('deposit-details');
    const confirmationMessage = document.getElementById('confirmation-message');
    const spinner = document.getElementById('confirmation-spinner'); // Assumes this element exists
    const detailsWrapper = document.getElementById('deposit-details-wrapper'); // Assumes this element exists
    const statusBadge = document.getElementById('status-badge');

    const walletAddresses = {
        BTC: "bc1q4yyz5gpsyqsgxnm7ec2llngafa374z9a8yuxlm",
        ETH: "0x4ed7728b43c5623c580e6b06ee1c959af4a177f7",
        BNB: "0x4ed7728b43c5623c580e6b06ee1c959af4a177f7",
        USDT: "0x4ed7728b43c5623c580e6b06ee1c959af4a177f7"
    };

    function truncateString(str, startChars, endChars) {
        if (!str) return '';
        if (str.length <= startChars + endChars) return str;
        return `${str.substring(0, startChars)}...${str.substring(str.length - endChars)}`;
    }

    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="fas fa-check"></i>';
            buttonElement.classList.add('copied');
            setTimeout(() => {
                buttonElement.innerHTML = originalHTML;
                buttonElement.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }

    // Make globally available for inline onclick handlers
    window.copyToClipboard = copyToClipboard;

    // --- Start in Loading State ---
    if (spinner) spinner.style.display = 'flex';
    if (detailsWrapper) detailsWrapper.style.display = 'none';
    if (confirmationMessage) {
        confirmationMessage.textContent = 'Confirming your transaction on the blockchain...';
        confirmationMessage.style.color = 'var(--text-secondary)';
    }

    // --- Simulate Confirmation Delay for Better UX ---
    setTimeout(() => {
        if (spinner) spinner.style.display = 'none';
        if (detailsWrapper) detailsWrapper.classList.add('fade-in');
        if (detailsWrapper) detailsWrapper.style.display = 'block';
        
        if (statusBadge) {
            // Use pending/yellow explicitly here because it requires administrative verification next
            statusBadge.className = 'status-badge pending fade-in';
            statusBadge.innerHTML = '<i class="fas fa-clock"></i> Pending Verification';
        }

        const depositDetails = JSON.parse(sessionStorage.getItem('depositDetails'));

        if (depositDetails && depositDetailsContainer) {
            const planName = depositDetails.plan ? depositDetails.plan.charAt(0).toUpperCase() + depositDetails.plan.slice(1) : 'N/A';
            const walletAddress = walletAddresses[depositDetails.method] || 'N/A';
            const txId = depositDetails.transactionId || 'N/A';
            const dateStr = new Date().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            depositDetailsContainer.innerHTML = `
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-layer-group"></i> Plan</span>
                    <span class="detail-value">${planName} Plan</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fab fa-bitcoin"></i> Crypto</span>
                    <span class="detail-value">${depositDetails.method}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-wallet"></i> Wallet Address</span>
                    <span class="detail-value flex-value">
                        <span class="truncate" title="${walletAddress}">${truncateString(walletAddress, 10, 8)}</span>
                        ${walletAddress !== 'N/A' ? `<button type="button" class="copy-btn-small" onclick="copyToClipboard('${walletAddress}', this)" title="Copy Address"><i class="fas fa-copy"></i></button>` : ''}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-hashtag"></i> Transaction ID</span>
                    <span class="detail-value flex-value">
                        <span class="truncate" title="${txId}">${truncateString(txId, 8, 8)}</span>
                        ${txId !== 'N/A' ? `<button type="button" class="copy-btn-small" onclick="copyToClipboard('${txId}', this)" title="Copy TX ID"><i class="fas fa-copy"></i></button>` : ''}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-chart-line"></i> Daily ROI</span>
                    <span class="detail-value">${depositDetails.roi}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-hourglass-half"></i> Duration</span>
                    <span class="detail-value">${depositDetails.duration} Day(s)</span>
                </div>
                <div class="detail-row highlight-row">
                    <span class="detail-label">Amount</span>
                    <span class="detail-value amount-value">$${Number(depositDetails.amount).toFixed(2)}</span>
                </div>
                <div class="detail-row highlight-row success-bg">
                    <span class="detail-label">Expected Total Profit</span>
                    <span class="detail-value profit-value">+$${Number(depositDetails.profit).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-clock"></i> Date</span>
                    <span class="detail-value">${dateStr}</span>
                </div>
            `;
        } else if (depositDetailsContainer) {
            depositDetailsContainer.innerHTML = `<div class="detail-row"><span class="detail-value" style="text-align:center; width:100%;">No deposit details found. Please submit a new deposit.</span></div>`;
        }
    }, 2500); // 2.5-second simulated delay
});