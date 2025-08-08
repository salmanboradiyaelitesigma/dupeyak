// Initialize Firebase
//client ka
const firebaseConfig = {
  apiKey: "AIzaSyCC6SilBsdYgtJVL2LGLiewhJXMaNqMrWI",
  authDomain: "dupeyaktest.firebaseapp.com",
  projectId: "dupeyaktest",
  storageBucket: "dupeyaktest.firebasestorage.app",
  messagingSenderId: "820990403204",
  appId: "1:820990403204:web:2a850c95d9d1e3848ed8d1",
  measurementId: "G-9R53SDE1HY"
};


// ✅ Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const setDoc = firebase.firestore();
const doc = firebase.firestore();


async function saveUserToFirestore(userInfo) {
     return db.collection("users").doc(userInfo.id).set({
    name: userInfo.name,
    email: userInfo.email,
    picture: userInfo.picture,
    loggedInAt: new Date(),
  });
}


async function handleOAuthSuccess(userInfo) {
        try {
            console.log('🔄 Processing OAuth success...');
            // Store user info in extension storage
            await new Promise((resolve) => {
                chrome.storage.local.set({
                    userEmail: userInfo.email,
                    userId: userInfo.id,
                    authTimestamp: Date.now()
                }, resolve);
            });
            console.log('✅ User info stored:', userInfo.email);
            //await updateAuthSection(userInfo);
        } catch (error) {
            console.error('❌ Failed to handle OAuth success:', error);
            throw error;
        }
    }
// Extension Page JavaScript
document.addEventListener('DOMContentLoaded', function () {
    console.log('Extension page loaded');

    // Initialize the page
    initializePage();
});

async function initializePage() {
    try {
        // Update version from manifest
        updateVersionDisplay();

        // Check authentication status and update UI
        const userData = await getUserData();
        await updateAuthSection(userData);

        // Check payment status if user is signed in
        if (userData.userEmail && userData.userId) {
            //await checkPaymentStatus(userData);
        } else {
            // Set up event listeners for signed-out state
            setupEventListeners();
        }

    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to initialize extension page');
    }
}

function updateVersionDisplay() {
    const versionElement = $('#extension-version');
    if (versionElement) {
        // Get version from manifest
        const manifest = chrome.runtime.getManifest();
        versionElement.textContent = `v${manifest.version}`;
        console.log('📋 Extension version:', manifest.version);
    }
}

function updateAppTitle(isPro = false) {
    const titleElement = $('#app-title');
    if (titleElement) {
        if (isPro) {
            titleElement.innerHTML = 'DupeYak Duplicate Remover <span class="pro-badge">PRO</span>';
        } else {
            titleElement.textContent = 'DupeYak Duplicate Remover';
        }
    }
}

function updateVersionStatus(isPro = false) {
    // Update app title with pro status
    updateAppTitle(isPro);

    // Update version display
    updateVersionDisplay();

    // Log the status change
    console.log('📊 Version status updated:', isPro ? 'PRO' : 'FREE');
}

async function checkPaymentStatus(userData) {
    try {
        console.log('🔍 Checking payment status for user:', userData.userEmail);

        // Generate auth hash for verification
        const result = await chrome.runtime.sendMessage({
            action: 'generateAuthHash',
            accountId: userData.userId,
            extensionId: chrome.runtime.id
        });

        if (!result.success) {
            throw new Error('Failed to generate auth hash');
        }

        // Check payment status with server
        const response = await fetch('https://api.gpdrm.com/check-payment-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accountId: userData.userId,
                email: userData.userEmail,
                authHash: result.authHash,
                extensionId: chrome.runtime.id
            })
        });

        if (response.ok) {
            const data = await response.json();
            // const isPaid = data.isPaid || false;
             const isPaid = true;


            console.log('✅ Payment status check complete:', isPaid ? 'PAID' : 'FREE');

            // Update local storage
            await new Promise((resolve) => {
                chrome.storage.local.set({
                    isPaidVersion: isPaid,
                    lastPaidStatusCheck: Date.now(),
                    paymentData: data.paymentData || null
                }, resolve);
            });

            // Update app title with pro badge
            updateAppTitle(isPaid);

            // Update Buy Pro button visibility
            //updateBuyProButton(isPaid);

            // Refresh the auth section with updated payment status
            await updateAuthSection(userData);

            // Re-setup event listeners since we recreated the buttons
            setupEventListeners();

            // Notify content script of status update
            notifyContentScript();

        } else {
            console.warn('⚠️ Payment status check failed:', response.status);
            // Fall back to local storage
            const localData = await new Promise((resolve) => {
                chrome.storage.local.get(['isPaidVersion'], resolve);
            });
            updateAppTitle(localData.isPaidVersion || false);
        }

    } catch (error) {
        console.error('❌ Error checking payment status:', error);
        // Fall back to local storage
        const localData = await new Promise((resolve) => {
            chrome.storage.local.get(['isPaidVersion'], resolve);
        });
        updateAppTitle(localData.isPaidVersion || false);
    }
}



// function updateBuyProButton(isPaid) {
//     const buyProBtn = $('#buy-pro-btn');
//     if (buyProBtn) {
//         if (isPaid) {
//             buyProBtn.style.display = 'none';
//         } else {
//             buyProBtn.style.display = 'inline-flex';
//         }
//     }
// }

async function getUserData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userEmail', 'userId'], (result) => {
            resolve(result);
        });
    });
}

async function updateAuthSection(userInfo) {
    const accountSection = document.querySelector('.account-section');

    if (userInfo.userEmail && userInfo.userId) {
        // User is signed in - get Pro status from storage
        const storageData = await new Promise((resolve) => {
            chrome.storage.local.get(['isPaidVersion'], resolve);
        });
        const isPro = storageData.isPaidVersion || false;

        accountSection.innerHTML = createSignedInHTML(userInfo.userEmail, isPro);

        // Update app title with pro status
        updateAppTitle(isPro);
    } else {
        // User is not signed in
        accountSection.innerHTML = createSignInHTML();

        // Set app title to free when not signed in
        updateAppTitle(false);
    }
}

function createSignedInHTML(email, isPro = false) {
    // Build the buttons array conditionally
    const buttons = [
        `<button class="btn btn-secondary" id="open-photos-btn">
            📸 Open Google Photos
        </button>`
    ];

    // Add Pro-only buttons if user has Pro
    if (isPro) {
        buttons.push(`<button class="btn btn-secondary" id="download-receipt-btn">
            📄 Download Receipt
        </button>`);

        buttons.push(`<button class="btn btn-secondary" id="support-btn">
            💬 Contact Support
        </button>`);
    }

    // Add Buy Pro button if user doesn't have Pro
    // if (!isPro) {
    //     buttons.push(`<button class="btn btn-primary" id="buy-pro-btn">
    //         💎 Buy Pro
    //     </button>`);
    // }

    // Always add Sign Out button
    buttons.push(`<button class="btn btn-danger" id="sign-out-btn">
        🚪 Sign Out
    </button>`);

    return `
        <div class="account-info">
            <div class="account-details">
                <div class="account-label">Signed in as:</div>
                <div class="account-email">${email}</div>
            </div>
            <div class="account-actions">
                ${buttons.join('\n                ')}
            </div>
        </div>
    `;
}

function createSignInHTML() {
    return `
        <div class="signin-container">
            <h2 class="signin-title">Welcome to DupeYak Duplicate Remover</h2>
            <p class="signin-subtitle">Sign in with your Google account to get started, buy PRO or restore your license</p>
            <button class="btn btn-primary" id="sign-in-btn">
                🔐 Sign in with Google
            </button>
        </div>
    `;
}

function setupEventListeners() {
    // Sign in button
    // const signInBtn = $('#sign-in-btn');
    // if (signInBtn.length) {
    //     signInBtn.on('click', handleSignIn);
    // }

    document.getElementById("sign-in-btn").addEventListener("click", async () => {
        
        //handleSignIn()
        chrome.identity.launchWebAuthFlow(
            {
                url: `https://accounts.google.com/o/oauth2/auth?client_id=904093800226-gdsb17l40m0cljstenr7muviigs5qa9k.apps.googleusercontent.com&response_type=token&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL('provider_cb'))}&scope=profile email`,
                interactive: true
            },
            function (redirectUrl) {
                if (chrome.runtime.lastError) {
                    console.error("Login failed:", chrome.runtime.lastError);
                    return;
                }

                const params = new URLSearchParams(new URL(redirectUrl).hash.substring(1));
                const accessToken = params.get("access_token");

                // Call Google User Info API
                fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                })
                    .then(res => res.json())
                    .then(async userInfo => {
                        console.log("User info:", userInfo);

                        // Send to Firebase API or Firestore entry
                        handleOAuthSuccess(userInfo);
                        
                        saveUserToFirestore(userInfo)
                            .then(() => {
                                console.log("User saved")
                                //checkLoginFromClient(userInfo.id);
                                //handleOAuthSuccess(userInfo);
                            })
                            .catch(console.error);

                        // await setDoc(doc(db, "users", userInfo.id), {
                        //     name: userInfo.name,
                        //     email: userInfo.email,
                        //     picture: userInfo.picture,
                        //     loggedInAt: new Date(),
                        // });

                        // OR: Send to your own backend endpoint

                    });
            }
        );


    });


    
    // Sign Out button
    const signOutBtn = $('#sign-out-btn');
    if (signOutBtn.length) {
        signOutBtn.on('click', handleSignOut);
    }

    // Open Photos button
    const openPhotosBtn = $('#open-photos-btn');
    if (openPhotosBtn.length) {
        openPhotosBtn.on('click', handleOpenPhotos);
    }

    // Download Receipt button
    const downloadReceiptBtn = $('#download-receipt-btn');
    if (downloadReceiptBtn.length) {
        downloadReceiptBtn.on('click', handleDownloadReceipt);
    }

    // Support button
    const supportBtn = $('#support-btn');
    if (supportBtn.length) {
        supportBtn.on('click', handleSupport);
    }

    // Buy Pro button
    const buyProBtn = $('#buy-pro-btn');
    if (buyProBtn.length) {
        buyProBtn.on('click', handleBuyPro);
    }

    // Footer links
    //setupFooterLinks();
}



async function handleSignIn() {
    const signInBtn = $('#sign-in-btn');
    if (signInBtn) {
        signInBtn.disabled = true;
        signInBtn.innerHTML = '<div class="spinner"></div> Opening Google OAuth...';
    }

    try {
        // Use the new polling-based OAuth flow
        const result = await chrome.runtime.sendMessage({
            action: 'authenticate'
        });

        if (result.success) {
            // Update button to show polling status
            if (signInBtn) {
                signInBtn.innerHTML = '<div class="spinner"></div> Complete sign-in in the opened tab...';
            }

            // The OAuth helper will handle polling and update storage
            // We'll get notified via the authenticationComplete message
            showSuccess('Authentication tab opened! Please complete sign-in in the new tab.');
        } else {
            throw new Error(result.error || 'Authentication failed');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showError('Failed to start authentication. Please try again.');

        // Reset button
        if (signInBtn) {
            signInBtn.disabled = false;
            signInBtn.innerHTML = '🔐 Sign in with Google';
        }
    }
}

async function handleSignOut() {
    const signOutBtn = $('#sign-out-btn');
    if (signOutBtn) {
        signOutBtn.disabled = true;
        signOutBtn.innerHTML = '<div class="spinner"></div> Signing out...';
    }

    try {
        // Clear stored user data and payment status
        await new Promise((resolve) => {
            chrome.storage.local.remove([
                'userEmail',
                'userId',
                'isPaidVersion',
                'lastPaidStatusCheck',
                'paymentData'
            ], resolve);
        });

        // Update UI to show signed-out state
        await updateAuthSection({});

        // Re-setup event listeners for the new buttons
        setupEventListeners();

        // Update app title to free version
        updateAppTitle(false);

        // Notify content script about the status change
        notifyContentScript();

        showSuccess('Successfully signed out!');
    } catch (error) {
        console.error('Sign out error:', error);
        showError('Failed to sign out. Please try again.');
    } finally {
        const signOutBtn = $('#sign-out-btn');
        if (signOutBtn) {
            signOutBtn.disabled = false;
            signOutBtn.innerHTML = '🚪 Sign Out';
        }
    }
}

function handleOpenPhotos() {
    chrome.tabs.create({ url: 'https://photos.google.com' });
}

async function handleDownloadReceipt() {
    const downloadBtn = $('#download-receipt-btn');
    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<div class="spinner"></div> Getting invoice...';
    }

    try {
        console.log('📄 Downloading invoice...');

        // Get user data
        const userData = await getUserData();
        if (!userData.userEmail || !userData.userId) {
            throw new Error('Please sign in first to download receipt');
        }

        // Generate auth hash
        const authResult = await chrome.runtime.sendMessage({
            action: 'generateAuthHash',
            accountId: userData.userId,
            extensionId: chrome.runtime.id
        });

        if (!authResult.success) {
            throw new Error('Failed to generate authentication');
        }

        // Request invoice URL from server
        const response = await fetch('https://api.gpdrm.com/download-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accountId: userData.userId,
                email: userData.userEmail,
                authHash: authResult.authHash,
                extensionId: chrome.runtime.id
            })
        });

        if (response.ok) {
            const data = await response.json();

            if (data.invoiceUrl) {
                // Open Stripe hosted invoice in new tab
                chrome.tabs.create({ url: data.invoiceUrl });
                console.log('✅ Opened Stripe hosted invoice:', data.invoiceUrl);
                showSuccess('Invoice opened in new tab!');
            } else {
                throw new Error('Invoice URL not available');
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get invoice');
        }

    } catch (error) {
        console.error('Download receipt error:', error);
        showError(error.message || 'Failed to download receipt. Please try again.');
    } finally {
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '📄 Download Receipt';
        }
    }
}

function handleSupport() {
    chrome.tabs.create({ url: 'https://t.me/gpdrm_support' });
}

async function handleBuyPro() {
    const buyProBtn =$('#buy-pro-btn');
    if (buyProBtn) {
        buyProBtn.disabled = true;
        buyProBtn.innerHTML = '<div class="spinner"></div> Opening purchase...';
    }

    try {
        // Get user info for purchase
        const userData = await getUserData();
        if (!userData.userEmail || !userData.userId) {
            throw new Error('Please sign in first to purchase Pro version');
        }

        // Generate auth hash and open purchase page
        const result = await chrome.runtime.sendMessage({
            action: 'generateAuthHash',
            accountId: userData.userId,
            extensionId: chrome.runtime.id
        });

        if (result.success) {
            const purchaseUrl = `https://api.gpdrm.com/purchase?accountId=${encodeURIComponent(userData.userId)}&email=${encodeURIComponent(userData.userEmail)}&authHash=${encodeURIComponent(result.authHash)}&extensionId=${encodeURIComponent(chrome.runtime.id)}`;

            // Open purchase page
            chrome.tabs.create({ url: purchaseUrl });

            // Update button to show polling status
            if (buyProBtn) {
                buyProBtn.innerHTML = '<div class="spinner"></div> Complete purchase in the opened tab...';
            }

            showSuccess('Purchase page opened! Complete your purchase in the new tab.');

            // Start polling for payment completion
            startPurchasePolling(userData);
        } else {
            throw new Error(result.error || 'Failed to generate purchase link');
        }
    } catch (error) {
        console.error('Buy Pro error:', error);
        showError(error.message || 'Failed to open purchase page. Please try again.');

        // Reset button on error
        if (buyProBtn) {
            buyProBtn.disabled = false;
            buyProBtn.innerHTML = '💎 Buy Pro';
        }
    }
}

async function startPurchasePolling(userData) {
    console.log('🔄 Starting purchase polling for user:', userData.userEmail);

    const maxAttempts = 180; // 3 minutes (180 seconds) with 1-second intervals
    let attempts = 0;

    const pollInterval = setInterval(async () => {
        attempts++;
        console.log(`🔍 Purchase polling attempt ${attempts}/${maxAttempts}`);

        try {
            // Check payment status using existing endpoint
            const authResult = await chrome.runtime.sendMessage({
                action: 'generateAuthHash',
                accountId: userData.userId,
                extensionId: chrome.runtime.id
            });

            if (!authResult.success) {
                throw new Error('Failed to generate auth hash');
            }

            const response = await fetch('https://api.gpdrm.com/check-payment-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId: userData.userId,
                    email: userData.userEmail,
                    authHash: authResult.authHash,
                    extensionId: chrome.runtime.id
                })
            });

            if (response.ok) {
                const data = await response.json();

                if (data.isPaid) {
                    // Payment completed!
                    clearInterval(pollInterval);
                    await handlePurchaseComplete(data);
                    return;
                }
            }

            // Continue polling if payment not completed yet
            if (attempts >= maxAttempts) {
                // Timeout reached
                clearInterval(pollInterval);
                handlePurchaseTimeout();
            }

        } catch (error) {
            console.error('❌ Purchase polling error:', error);

            // Continue polling unless we've reached max attempts
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                handlePurchaseTimeout();
            }
        }
    }, 1000); // Poll every second
}

async function handlePurchaseComplete(paymentData) {
    console.log('✅ Purchase completed successfully!');

    // Update local storage with payment data
    await new Promise((resolve) => {
        chrome.storage.local.set({
            isPaidVersion: true,
            lastPaidStatusCheck: Date.now(),
            paymentData: paymentData.paymentData || null
        }, resolve);
    });

    // Update UI
    updateVersionStatus(true);
    //updateBuyProButton(true);

    // Refresh auth section to show Pro buttons
    const userData = await getUserData();
    await updateAuthSection(userData);

    // Re-setup event listeners for the new buttons
    setupEventListeners();

    // Reset Buy Pro button (if it still exists)
    const buyProBtn = $('#buy-pro-btn');
    if (buyProBtn) {
        buyProBtn.disabled = false;
        buyProBtn.innerHTML = '💎 Buy Pro';
    }

    // Notify content script
    notifyContentScript();

    // Show success message
    showSuccess('🎉 Purchase completed successfully! Pro features are now active.');
}

function handlePurchaseTimeout() {
    console.log('⏰ Purchase polling timed out');

    // Reset Buy Pro button
    const buyProBtn = $('#buy-pro-btn');
    if (buyProBtn) {
        buyProBtn.disabled = false;
        buyProBtn.innerHTML = '💎 Buy Pro';
    }

    // Show timeout message
    showError('Purchase polling timed out. If you completed the purchase, please refresh the page or restart the extension.');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });

    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#34a853';
            break;
        case 'error':
            notification.style.backgroundColor = '#ea4335';
            break;
        default:
            notification.style.backgroundColor = '#4285f4';
    }

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Listen for storage changes to update UI
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.userEmail || changes.userId) {
            // Refresh auth section when user data changes
            getUserData().then(async userData => {
                await updateAuthSection(userData);
                // Re-setup event listeners for the new buttons
                setupEventListeners();
            });
        }

        if (changes.isPaidVersion) {
            // Update version status when payment status changes
            updateVersionStatus(changes.isPaidVersion.newValue || false);
            //updateBuyProButton(changes.isPaidVersion.newValue || false);
        }
    }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'authenticationComplete') {
        // Refresh the page when authentication completes
        const userData = await getUserData();
        await updateAuthSection(userData);

        // Re-setup event listeners for the new buttons
        setupEventListeners();

        // Check payment status for the newly signed-in user
        if (userData.userEmail && userData.userId) {
            //await checkPaymentStatus(userData);
        }

        showSuccess('Authentication completed successfully!');

        // Reset sign-in button if it exists
        const signInBtn = $('#sign-in-btn');
        if (signInBtn) {
            signInBtn.disabled = false;
            signInBtn.innerHTML = '🔐 Sign in with Google';
        }
    }
});

function notifyContentScript() {
    // Notify all tabs about payment status update
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && tab.url.includes('photos.google.com')) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'paymentStatusUpdated'
                }).catch(() => {
                    // Ignore errors for tabs without content script
                });
            }
        });
    });
} 

var extensionPageObj = {
    addEvents: function (params) {
        $(document).on("click", '#sign-out-btn', function (event) {
            handleSignOut()
        });

        $(document).on("click", '#open-photos-btn', function (event) {
            handleOpenPhotos();
        });
    }
}

$(document).ready(function () {
    extensionPageObj.addEvents();
})