// Initialize Lucide icons (best effort)
if (typeof lucide !== 'undefined') lucide.createIcons();

// Track whether error was already handled by extractTokenAndEmail
let errorHandled = false;

// ================================================================
// Token Extraction
// ================================================================
// Priority: hash fragment → query params → regex on href
// ================================================================

// DOM element references
const loadingState = document.getElementById('loading-state');
const successState = document.getElementById('success-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const resendBtn = document.getElementById('resend-btn');
const resendStatus = document.getElementById('resend-status');
const urlInput = document.getElementById('url-input');
const submitUrlBtn = document.getElementById('submit-url-btn');
const countdownEl = document.getElementById('countdown');

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || 'http://localhost:5000';

function extractTokenAndEmail() {
    let token = null;
    let email = null;

    if (window.location.hash && window.location.hash.length > 1) {
        const hashStr = window.location.hash.substring(1);

        if (hashStr.startsWith('error=')) {
            const errorType = hashStr.split('=')[1];
            handleRedirectError(errorType);
            return { token: null, email: null };
        }

        const hashParams = new URLSearchParams(hashStr);
        token = hashParams.get('token');
        email = hashParams.get('email');
    }

    if (!token || !email) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('token')) token = urlParams.get('token');
        if (urlParams.get('email')) email = urlParams.get('email');
    }

    if (!token || !email) {
        const href = window.location.href;
        const tokenMatch = href.match(/[?&#]token=([^&#]+)/);
        const emailMatch = href.match(/[?&#]email=([^&#]+)/);
        if (tokenMatch && !token) token = decodeURIComponent(tokenMatch[1]);
        if (emailMatch && !email) email = decodeURIComponent(emailMatch[1]);
    }

    return { token, email };
}

/**
 * Handle error codes passed via hash fragment from the backend redirect.
 */
function handleRedirectError(errorType) {
    errorHandled = true;
    loadingState.classList.add('hidden');

    switch (errorType) {
        case 'invalid':
            showError('Invalid verification link: The link is not recognized.');
            break;
        case 'expired':
            showError('Verification link has expired. Please request a new one.');
            break;
        case 'already_verified':
            showSuccess();
            break;
        case 'server_error':
            showError('A server error occurred. Please try again later.');
            break;
        default:
            showError('Invalid verification link: An unknown error occurred.');
    }
}

const { token: tokenRaw, email: emailRaw } = extractTokenAndEmail();
const token = tokenRaw ? tokenRaw.trim() : null;
const email = emailRaw ? emailRaw.trim() : null;

if (!errorHandled && !token) {
    loadingState.classList.add('hidden');
    showError('Invalid verification link: No token found in URL.');
} else if (!errorHandled && token.length < 20) {
    loadingState.classList.add('hidden');
    showError('Invalid verification link: Token appears incomplete or truncated.');
} else if (!errorHandled && token) {
    verifyEmail(token);
}

/**
 * Verify email with backend
 */
async function verifyEmail(token) {
    const url = `${API_BASE}/api/auth/verify/${encodeURIComponent(token)}`;

    try {
        const response = await fetch(url, { method: 'GET' });
        const result = await response.json();

        if (response.ok && result.success) {
            showSuccess();
        } else {
            const errorMsg = result.error || result.message || `Verification failed (HTTP ${response.status})`;
            showError(errorMsg);
        }
    } catch (err) {
        showError('Network error. Please check your connection and try again.');
    }
}

/**
 * Show success state
 */
function showSuccess() {
    loadingState.classList.add('hidden');
    successState.classList.remove('hidden');

    let countdown = 5;
    countdownEl.textContent = countdown.toString();

    const timer = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown.toString();

        if (countdown <= 0) {
            clearInterval(timer);
            window.location.href = 'login.html';
        }
    }, 1000);
}

/**
 * Show error state
 */
function showError(message) {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorMessage.textContent = message;
}

/**
 * Resend verification email
 */
resendBtn.addEventListener('click', async () => {
    let emailToSend = email;
    if (!emailToSend) {
        emailToSend = prompt('Please enter your email address to resend the verification:');
    }

    if (!emailToSend || !emailToSend.trim()) {
        return;
    }

    emailToSend = emailToSend.trim();

    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';
    setResendStatus('Sending...', 'info');

    if (!errorState.classList.contains('hidden')) {
        errorMessage.textContent = '';
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/resend-verification`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailToSend }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const msg = result.message || 'Verification email sent!';
            setResendStatus(msg, 'success');
            resendBtn.textContent = '✓ Sent';
            errorMessage.textContent = '';

            setTimeout(() => {
                resendBtn.textContent = 'Resend Verification Email';
                resendBtn.disabled = false;
                clearResendStatus();
            }, 3000);
        }
    } catch (err) {
        setResendStatus('Network error. Please try again.', 'error');
        resendBtn.textContent = '✗ Error';
        showError('Network error. Please check your connection and try again.');
        setTimeout(() => {
            resendBtn.textContent = 'Resend Verification Email';
            resendBtn.disabled = false;
            clearResendStatus();
        }, 3000);
    }
});

/**
 * Set resend status message
 */
function setResendStatus(message, type = 'info') {
    resendStatus.textContent = message;
    resendStatus.className = 'resend-status visible ' + type;
}

/**
 * Clear resend status after delay
 */
function clearResendStatus() {
    resendStatus.classList.remove('visible');
    setTimeout(() => {
        resendStatus.textContent = '';
        resendStatus.className = 'resend-status';
    }, 300);
}

/**
 * Handle manual URL paste verification (fallback when token missing from URL)
 */
submitUrlBtn.addEventListener('click', async () => {
    const pastedUrl = urlInput.value.trim();
    if (!pastedUrl) {
        alert('Please paste the full verification URL from your email.');
        return;
    }

    try {
        const url = new URL(pastedUrl);
        const pathSegments = url.pathname.split('/');
        let tokenFromPath = null;
        const redirectIndex = pathSegments.findIndex(s => s === 'verify-redirect');
        if (redirectIndex !== -1 && pathSegments[redirectIndex + 1]) {
            tokenFromPath = pathSegments[redirectIndex + 1];
        }

        let tokenFromUrl = url.searchParams.get('token') || new URLSearchParams(url.hash.substring(1)).get('token');
        if (!tokenFromUrl) tokenFromUrl = tokenFromPath;

        if (!tokenFromUrl) {
            alert('Invalid verification URL: missing token.');
            return;
        }

        submitUrlBtn.disabled = true;
        submitUrlBtn.textContent = 'Verifying...';

        const response = await fetch(`${API_BASE}/api/auth/verify/${encodeURIComponent(tokenFromUrl)}`, {
            credentials: 'include',
            method: 'GET',
        });
        const result = await response.json();

        if (response.ok && result.success) {
            showSuccess();
        }
    } catch (err) {
        alert('Failed to parse URL or connect to server. Please check the URL and try again.');
        submitUrlBtn.disabled = false;
        submitUrlBtn.textContent = 'Verify';
    }
});

// Allow Enter key in URL input
urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        submitUrlBtn.click();
    }
});
