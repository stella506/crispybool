import { supabase } from "../src/lib/supabaseClient.js";

document.addEventListener('DOMContentLoaded', () => {
    const withdrawalDetailsContainer = document.getElementById('deposit-details'); // Reusing deposit details container structure
    const confirmationMessage = document.getElementById('confirmation-message');
    const spinner = document.getElementById('confirmation-spinner');
    const detailsWrapper = document.getElementById('deposit-details-wrapper'); // Reusing deposit details wrapper
    const statusBadge = document.getElementById('status-badge');

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

    window.copyToClipboard = copyToClipboard;

    if (spinner) spinner.style.display = 'flex';
    if (detailsWrapper) detailsWrapper.style.display = 'none';
    if (confirmationMessage) {
        confirmationMessage.textContent = 'Processing your withdrawal request...';
        confirmationMessage.style.color = 'var(--text-secondary)';
    }

    setTimeout(() => {
        if (spinner) spinner.style.display = 'none';
        if (detailsWrapper) detailsWrapper.classList.add('fade-in');
        if (detailsWrapper) detailsWrapper.style.display = 'block';
        
        if (statusBadge) {
            statusBadge.className = 'status-badge pending fade-in';
            statusBadge.innerHTML = '<i class="fas fa-clock"></i> Pending Verification';
        }

        const withdrawalDetails = JSON.parse(sessionStorage.getItem('withdrawalDetails'));

        if (withdrawalDetails && withdrawalDetailsContainer) {
            const walletAddress = withdrawalDetails.address || 'N/A';
            const txId = withdrawalDetails.transactionId || 'N/A';
            const dateStr = new Date().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            withdrawalDetailsContainer.innerHTML = `
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-layer-group"></i> Type</span>
                    <span class="detail-value">${withdrawalDetails.type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-wallet"></i> Method</span>
                    <span class="detail-value">${withdrawalDetails.method}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-link"></i> Address</span>
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
                <div class="detail-row highlight-row success-bg">
                    <span class="detail-label">Amount</span>
                    <span class="detail-value amount-value">$${Number(withdrawalDetails.amount).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-clock"></i> Date</span>
                    <span class="detail-value">${dateStr}</span>
                </div>
            `;
        } else if (withdrawalDetailsContainer) {
            withdrawalDetailsContainer.innerHTML = `<div class="detail-row"><span class="detail-value" style="text-align:center; width:100%;">No withdrawal details found.</span></div>`;
        }
    }, 2500); // Simulated delay
});