/******/ (() => { // webpackBootstrap
/*!**********************************!*\
  !*** ./src/js/extension-page.js ***!
  \**********************************/
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
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uX3BhZ2UuanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5Q0FBeUMsaUJBQWlCO0FBQzFEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZDQUE2QyxNQUFNO0FBQ25EO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNMQUFzTCxrRUFBa0U7QUFDeFA7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQWlELFlBQVk7QUFDN0QscUJBQXFCO0FBQ3JCLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0QkFBNEI7QUFDNUI7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0Esa0NBQWtDO0FBQ2xDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUIsa0NBQWtDO0FBQzNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUNBQXFDLHNCQUFzQjtBQUMzRDtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCLG1DQUFtQztBQUM1RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLDRFQUE0RSxvQ0FBb0MsU0FBUyx1Q0FBdUMsWUFBWSxvQ0FBb0MsZUFBZSxzQ0FBc0M7QUFDclE7QUFDQTtBQUNBLGlDQUFpQyxrQkFBa0I7QUFDbkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbURBQW1ELFNBQVMsR0FBRyxZQUFZO0FBQzNFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSyxTQUFTO0FBQ2Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMERBQTBELEtBQUs7QUFDL0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QjtBQUN4QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQyxDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vbGF0ZXN0Ly4vc3JjL2pzL2V4dGVuc2lvbi1wYWdlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIEluaXRpYWxpemUgRmlyZWJhc2VcclxuLy9jbGllbnQga2FcclxuY29uc3QgZmlyZWJhc2VDb25maWcgPSB7XHJcbiAgYXBpS2V5OiBcIkFJemFTeUNDNlNpbEJzZFlndEpWTDJMR0xpZXdoSlhNYU5xTXJXSVwiLFxyXG4gIGF1dGhEb21haW46IFwiZHVwZXlha3Rlc3QuZmlyZWJhc2VhcHAuY29tXCIsXHJcbiAgcHJvamVjdElkOiBcImR1cGV5YWt0ZXN0XCIsXHJcbiAgc3RvcmFnZUJ1Y2tldDogXCJkdXBleWFrdGVzdC5maXJlYmFzZXN0b3JhZ2UuYXBwXCIsXHJcbiAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiODIwOTkwNDAzMjA0XCIsXHJcbiAgYXBwSWQ6IFwiMTo4MjA5OTA0MDMyMDQ6d2ViOjJhODUwYzk1ZDlkMWUzODQ4ZWQ4ZDFcIixcclxuICBtZWFzdXJlbWVudElkOiBcIkctOVI1M1NERTFIWVwiXHJcbn07XHJcblxyXG5cclxuLy8g4pyFIEluaXRpYWxpemUgRmlyZWJhc2VcclxuY29uc3QgYXBwID0gZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChmaXJlYmFzZUNvbmZpZyk7XHJcbmNvbnN0IGF1dGggPSBmaXJlYmFzZS5hdXRoKCk7XHJcbmNvbnN0IGRiID0gZmlyZWJhc2UuZmlyZXN0b3JlKCk7XHJcbmNvbnN0IHNldERvYyA9IGZpcmViYXNlLmZpcmVzdG9yZSgpO1xyXG5jb25zdCBkb2MgPSBmaXJlYmFzZS5maXJlc3RvcmUoKTtcclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiBzYXZlVXNlclRvRmlyZXN0b3JlKHVzZXJJbmZvKSB7XHJcbiAgICAgcmV0dXJuIGRiLmNvbGxlY3Rpb24oXCJ1c2Vyc1wiKS5kb2ModXNlckluZm8uaWQpLnNldCh7XHJcbiAgICBuYW1lOiB1c2VySW5mby5uYW1lLFxyXG4gICAgZW1haWw6IHVzZXJJbmZvLmVtYWlsLFxyXG4gICAgcGljdHVyZTogdXNlckluZm8ucGljdHVyZSxcclxuICAgIGxvZ2dlZEluQXQ6IG5ldyBEYXRlKCksXHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVPQXV0aFN1Y2Nlc3ModXNlckluZm8pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBQcm9jZXNzaW5nIE9BdXRoIHN1Y2Nlc3MuLi4nKTtcclxuICAgICAgICAgICAgLy8gU3RvcmUgdXNlciBpbmZvIGluIGV4dGVuc2lvbiBzdG9yYWdlXHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJFbWFpbDogdXNlckluZm8uZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgdXNlcklkOiB1c2VySW5mby5pZCxcclxuICAgICAgICAgICAgICAgICAgICBhdXRoVGltZXN0YW1wOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9LCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgVXNlciBpbmZvIHN0b3JlZDonLCB1c2VySW5mby5lbWFpbCk7XHJcbiAgICAgICAgICAgIC8vYXdhaXQgdXBkYXRlQXV0aFNlY3Rpb24odXNlckluZm8pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gaGFuZGxlIE9BdXRoIHN1Y2Nlc3M6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbi8vIEV4dGVuc2lvbiBQYWdlIEphdmFTY3JpcHRcclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgIGNvbnNvbGUubG9nKCdFeHRlbnNpb24gcGFnZSBsb2FkZWQnKTtcclxuXHJcbiAgICAvLyBJbml0aWFsaXplIHRoZSBwYWdlXHJcbiAgICBpbml0aWFsaXplUGFnZSgpO1xyXG59KTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXRpYWxpemVQYWdlKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBVcGRhdGUgdmVyc2lvbiBmcm9tIG1hbmlmZXN0XHJcbiAgICAgICAgdXBkYXRlVmVyc2lvbkRpc3BsYXkoKTtcclxuXHJcbiAgICAgICAgLy8gQ2hlY2sgYXV0aGVudGljYXRpb24gc3RhdHVzIGFuZCB1cGRhdGUgVUlcclxuICAgICAgICBjb25zdCB1c2VyRGF0YSA9IGF3YWl0IGdldFVzZXJEYXRhKCk7XHJcbiAgICAgICAgYXdhaXQgdXBkYXRlQXV0aFNlY3Rpb24odXNlckRhdGEpO1xyXG5cclxuICAgICAgICAvLyBDaGVjayBwYXltZW50IHN0YXR1cyBpZiB1c2VyIGlzIHNpZ25lZCBpblxyXG4gICAgICAgIGlmICh1c2VyRGF0YS51c2VyRW1haWwgJiYgdXNlckRhdGEudXNlcklkKSB7XHJcbiAgICAgICAgICAgIC8vYXdhaXQgY2hlY2tQYXltZW50U3RhdHVzKHVzZXJEYXRhKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBTZXQgdXAgZXZlbnQgbGlzdGVuZXJzIGZvciBzaWduZWQtb3V0IHN0YXRlXHJcbiAgICAgICAgICAgIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbml0aWFsaXppbmcgcGFnZTonLCBlcnJvcik7XHJcbiAgICAgICAgc2hvd0Vycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBleHRlbnNpb24gcGFnZScpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVWZXJzaW9uRGlzcGxheSgpIHtcclxuICAgIGNvbnN0IHZlcnNpb25FbGVtZW50ID0gJCgnI2V4dGVuc2lvbi12ZXJzaW9uJyk7XHJcbiAgICBpZiAodmVyc2lvbkVsZW1lbnQpIHtcclxuICAgICAgICAvLyBHZXQgdmVyc2lvbiBmcm9tIG1hbmlmZXN0XHJcbiAgICAgICAgY29uc3QgbWFuaWZlc3QgPSBjaHJvbWUucnVudGltZS5nZXRNYW5pZmVzdCgpO1xyXG4gICAgICAgIHZlcnNpb25FbGVtZW50LnRleHRDb250ZW50ID0gYHYke21hbmlmZXN0LnZlcnNpb259YDtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+TiyBFeHRlbnNpb24gdmVyc2lvbjonLCBtYW5pZmVzdC52ZXJzaW9uKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQXBwVGl0bGUoaXNQcm8gPSBmYWxzZSkge1xyXG4gICAgY29uc3QgdGl0bGVFbGVtZW50ID0gJCgnI2FwcC10aXRsZScpO1xyXG4gICAgaWYgKHRpdGxlRWxlbWVudCkge1xyXG4gICAgICAgIGlmIChpc1Bybykge1xyXG4gICAgICAgICAgICB0aXRsZUVsZW1lbnQuaW5uZXJIVE1MID0gJ0R1cGVZYWsgRHVwbGljYXRlIFJlbW92ZXIgPHNwYW4gY2xhc3M9XCJwcm8tYmFkZ2VcIj5QUk88L3NwYW4+JztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aXRsZUVsZW1lbnQudGV4dENvbnRlbnQgPSAnRHVwZVlhayBEdXBsaWNhdGUgUmVtb3Zlcic7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVWZXJzaW9uU3RhdHVzKGlzUHJvID0gZmFsc2UpIHtcclxuICAgIC8vIFVwZGF0ZSBhcHAgdGl0bGUgd2l0aCBwcm8gc3RhdHVzXHJcbiAgICB1cGRhdGVBcHBUaXRsZShpc1Bybyk7XHJcblxyXG4gICAgLy8gVXBkYXRlIHZlcnNpb24gZGlzcGxheVxyXG4gICAgdXBkYXRlVmVyc2lvbkRpc3BsYXkoKTtcclxuXHJcbiAgICAvLyBMb2cgdGhlIHN0YXR1cyBjaGFuZ2VcclxuICAgIGNvbnNvbGUubG9nKCfwn5OKIFZlcnNpb24gc3RhdHVzIHVwZGF0ZWQ6JywgaXNQcm8gPyAnUFJPJyA6ICdGUkVFJyk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrUGF5bWVudFN0YXR1cyh1c2VyRGF0YSkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+UjSBDaGVja2luZyBwYXltZW50IHN0YXR1cyBmb3IgdXNlcjonLCB1c2VyRGF0YS51c2VyRW1haWwpO1xyXG5cclxuICAgICAgICAvLyBHZW5lcmF0ZSBhdXRoIGhhc2ggZm9yIHZlcmlmaWNhdGlvblxyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuICAgICAgICAgICAgYWN0aW9uOiAnZ2VuZXJhdGVBdXRoSGFzaCcsXHJcbiAgICAgICAgICAgIGFjY291bnRJZDogdXNlckRhdGEudXNlcklkLFxyXG4gICAgICAgICAgICBleHRlbnNpb25JZDogY2hyb21lLnJ1bnRpbWUuaWRcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBhdXRoIGhhc2gnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENoZWNrIHBheW1lbnQgc3RhdHVzIHdpdGggc2VydmVyXHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGkuZ3Bkcm0uY29tL2NoZWNrLXBheW1lbnQtc3RhdHVzJywge1xyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgYWNjb3VudElkOiB1c2VyRGF0YS51c2VySWQsXHJcbiAgICAgICAgICAgICAgICBlbWFpbDogdXNlckRhdGEudXNlckVtYWlsLFxyXG4gICAgICAgICAgICAgICAgYXV0aEhhc2g6IHJlc3VsdC5hdXRoSGFzaCxcclxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAocmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICAgICAgLy8gY29uc3QgaXNQYWlkID0gZGF0YS5pc1BhaWQgfHwgZmFsc2U7XHJcbiAgICAgICAgICAgICBjb25zdCBpc1BhaWQgPSB0cnVlO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgUGF5bWVudCBzdGF0dXMgY2hlY2sgY29tcGxldGU6JywgaXNQYWlkID8gJ1BBSUQnIDogJ0ZSRUUnKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBsb2NhbCBzdG9yYWdlXHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgICAgIGlzUGFpZFZlcnNpb246IGlzUGFpZCxcclxuICAgICAgICAgICAgICAgICAgICBsYXN0UGFpZFN0YXR1c0NoZWNrOiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICAgIHBheW1lbnREYXRhOiBkYXRhLnBheW1lbnREYXRhIHx8IG51bGxcclxuICAgICAgICAgICAgICAgIH0sIHJlc29sdmUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhcHAgdGl0bGUgd2l0aCBwcm8gYmFkZ2VcclxuICAgICAgICAgICAgdXBkYXRlQXBwVGl0bGUoaXNQYWlkKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBCdXkgUHJvIGJ1dHRvbiB2aXNpYmlsaXR5XHJcbiAgICAgICAgICAgIC8vdXBkYXRlQnV5UHJvQnV0dG9uKGlzUGFpZCk7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWZyZXNoIHRoZSBhdXRoIHNlY3Rpb24gd2l0aCB1cGRhdGVkIHBheW1lbnQgc3RhdHVzXHJcbiAgICAgICAgICAgIGF3YWl0IHVwZGF0ZUF1dGhTZWN0aW9uKHVzZXJEYXRhKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFJlLXNldHVwIGV2ZW50IGxpc3RlbmVycyBzaW5jZSB3ZSByZWNyZWF0ZWQgdGhlIGJ1dHRvbnNcclxuICAgICAgICAgICAgc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG5cclxuICAgICAgICAgICAgLy8gTm90aWZ5IGNvbnRlbnQgc2NyaXB0IG9mIHN0YXR1cyB1cGRhdGVcclxuICAgICAgICAgICAgbm90aWZ5Q29udGVudFNjcmlwdCgpO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ+KaoO+4jyBQYXltZW50IHN0YXR1cyBjaGVjayBmYWlsZWQ6JywgcmVzcG9uc2Uuc3RhdHVzKTtcclxuICAgICAgICAgICAgLy8gRmFsbCBiYWNrIHRvIGxvY2FsIHN0b3JhZ2VcclxuICAgICAgICAgICAgY29uc3QgbG9jYWxEYXRhID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ2lzUGFpZFZlcnNpb24nXSwgcmVzb2x2ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB1cGRhdGVBcHBUaXRsZShsb2NhbERhdGEuaXNQYWlkVmVyc2lvbiB8fCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEVycm9yIGNoZWNraW5nIHBheW1lbnQgc3RhdHVzOicsIGVycm9yKTtcclxuICAgICAgICAvLyBGYWxsIGJhY2sgdG8gbG9jYWwgc3RvcmFnZVxyXG4gICAgICAgIGNvbnN0IGxvY2FsRGF0YSA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ2lzUGFpZFZlcnNpb24nXSwgcmVzb2x2ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdXBkYXRlQXBwVGl0bGUobG9jYWxEYXRhLmlzUGFpZFZlcnNpb24gfHwgZmFsc2UpO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuXHJcbi8vIGZ1bmN0aW9uIHVwZGF0ZUJ1eVByb0J1dHRvbihpc1BhaWQpIHtcclxuLy8gICAgIGNvbnN0IGJ1eVByb0J0biA9ICQoJyNidXktcHJvLWJ0bicpO1xyXG4vLyAgICAgaWYgKGJ1eVByb0J0bikge1xyXG4vLyAgICAgICAgIGlmIChpc1BhaWQpIHtcclxuLy8gICAgICAgICAgICAgYnV5UHJvQnRuLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbi8vICAgICAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgICAgICAgYnV5UHJvQnRuLnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lLWZsZXgnO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoWyd1c2VyRW1haWwnLCAndXNlcklkJ10sIChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUF1dGhTZWN0aW9uKHVzZXJJbmZvKSB7XHJcbiAgICBjb25zdCBhY2NvdW50U2VjdGlvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hY2NvdW50LXNlY3Rpb24nKTtcclxuXHJcbiAgICBpZiAodXNlckluZm8udXNlckVtYWlsICYmIHVzZXJJbmZvLnVzZXJJZCkge1xyXG4gICAgICAgIC8vIFVzZXIgaXMgc2lnbmVkIGluIC0gZ2V0IFBybyBzdGF0dXMgZnJvbSBzdG9yYWdlXHJcbiAgICAgICAgY29uc3Qgc3RvcmFnZURhdGEgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoWydpc1BhaWRWZXJzaW9uJ10sIHJlc29sdmUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IGlzUHJvID0gc3RvcmFnZURhdGEuaXNQYWlkVmVyc2lvbiB8fCBmYWxzZTtcclxuXHJcbiAgICAgICAgYWNjb3VudFNlY3Rpb24uaW5uZXJIVE1MID0gY3JlYXRlU2lnbmVkSW5IVE1MKHVzZXJJbmZvLnVzZXJFbWFpbCwgaXNQcm8pO1xyXG5cclxuICAgICAgICAvLyBVcGRhdGUgYXBwIHRpdGxlIHdpdGggcHJvIHN0YXR1c1xyXG4gICAgICAgIHVwZGF0ZUFwcFRpdGxlKGlzUHJvKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gVXNlciBpcyBub3Qgc2lnbmVkIGluXHJcbiAgICAgICAgYWNjb3VudFNlY3Rpb24uaW5uZXJIVE1MID0gY3JlYXRlU2lnbkluSFRNTCgpO1xyXG5cclxuICAgICAgICAvLyBTZXQgYXBwIHRpdGxlIHRvIGZyZWUgd2hlbiBub3Qgc2lnbmVkIGluXHJcbiAgICAgICAgdXBkYXRlQXBwVGl0bGUoZmFsc2UpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVTaWduZWRJbkhUTUwoZW1haWwsIGlzUHJvID0gZmFsc2UpIHtcclxuICAgIC8vIEJ1aWxkIHRoZSBidXR0b25zIGFycmF5IGNvbmRpdGlvbmFsbHlcclxuICAgIGNvbnN0IGJ1dHRvbnMgPSBbXHJcbiAgICAgICAgYDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGlkPVwib3Blbi1waG90b3MtYnRuXCI+XHJcbiAgICAgICAgICAgIPCfk7ggT3BlbiBHb29nbGUgUGhvdG9zXHJcbiAgICAgICAgPC9idXR0b24+YFxyXG4gICAgXTtcclxuXHJcbiAgICAvLyBBZGQgUHJvLW9ubHkgYnV0dG9ucyBpZiB1c2VyIGhhcyBQcm9cclxuICAgIGlmIChpc1Bybykge1xyXG4gICAgICAgIGJ1dHRvbnMucHVzaChgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgaWQ9XCJkb3dubG9hZC1yZWNlaXB0LWJ0blwiPlxyXG4gICAgICAgICAgICDwn5OEIERvd25sb2FkIFJlY2VpcHRcclxuICAgICAgICA8L2J1dHRvbj5gKTtcclxuXHJcbiAgICAgICAgYnV0dG9ucy5wdXNoKGA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBpZD1cInN1cHBvcnQtYnRuXCI+XHJcbiAgICAgICAgICAgIPCfkqwgQ29udGFjdCBTdXBwb3J0XHJcbiAgICAgICAgPC9idXR0b24+YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIEJ1eSBQcm8gYnV0dG9uIGlmIHVzZXIgZG9lc24ndCBoYXZlIFByb1xyXG4gICAgLy8gaWYgKCFpc1Bybykge1xyXG4gICAgLy8gICAgIGJ1dHRvbnMucHVzaChgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tcHJpbWFyeVwiIGlkPVwiYnV5LXByby1idG5cIj5cclxuICAgIC8vICAgICAgICAg8J+SjiBCdXkgUHJvXHJcbiAgICAvLyAgICAgPC9idXR0b24+YCk7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgLy8gQWx3YXlzIGFkZCBTaWduIE91dCBidXR0b25cclxuICAgIGJ1dHRvbnMucHVzaChgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tZGFuZ2VyXCIgaWQ9XCJzaWduLW91dC1idG5cIj5cclxuICAgICAgICDwn5qqIFNpZ24gT3V0XHJcbiAgICA8L2J1dHRvbj5gKTtcclxuXHJcbiAgICByZXR1cm4gYFxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWluZm9cIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtZGV0YWlsc1wiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtbGFiZWxcIj5TaWduZWQgaW4gYXM6PC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1lbWFpbFwiPiR7ZW1haWx9PC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1hY3Rpb25zXCI+XHJcbiAgICAgICAgICAgICAgICAke2J1dHRvbnMuam9pbignXFxuICAgICAgICAgICAgICAgICcpfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgIGA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVNpZ25JbkhUTUwoKSB7XHJcbiAgICByZXR1cm4gYFxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJzaWduaW4tY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgIDxoMiBjbGFzcz1cInNpZ25pbi10aXRsZVwiPldlbGNvbWUgdG8gRHVwZVlhayBEdXBsaWNhdGUgUmVtb3ZlcjwvaDI+XHJcbiAgICAgICAgICAgIDxwIGNsYXNzPVwic2lnbmluLXN1YnRpdGxlXCI+U2lnbiBpbiB3aXRoIHlvdXIgR29vZ2xlIGFjY291bnQgdG8gZ2V0IHN0YXJ0ZWQsIGJ1eSBQUk8gb3IgcmVzdG9yZSB5b3VyIGxpY2Vuc2U8L3A+XHJcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXByaW1hcnlcIiBpZD1cInNpZ24taW4tYnRuXCI+XHJcbiAgICAgICAgICAgICAgICDwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGVcclxuICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICBgO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXR1cEV2ZW50TGlzdGVuZXJzKCkge1xyXG4gICAgLy8gU2lnbiBpbiBidXR0b25cclxuICAgIC8vIGNvbnN0IHNpZ25JbkJ0biA9ICQoJyNzaWduLWluLWJ0bicpO1xyXG4gICAgLy8gaWYgKHNpZ25JbkJ0bi5sZW5ndGgpIHtcclxuICAgIC8vICAgICBzaWduSW5CdG4ub24oJ2NsaWNrJywgaGFuZGxlU2lnbkluKTtcclxuICAgIC8vIH1cclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNpZ24taW4tYnRuXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9oYW5kbGVTaWduSW4oKVxyXG4gICAgICAgIGNocm9tZS5pZGVudGl0eS5sYXVuY2hXZWJBdXRoRmxvdyhcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdXJsOiBgaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGg/Y2xpZW50X2lkPTkwNDA5MzgwMDIyNi1nZHNiMTdsNDBtMGNsanN0ZW5yN211dmlpZ3M1cWE5ay5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSZyZXNwb25zZV90eXBlPXRva2VuJnJlZGlyZWN0X3VyaT0ke2VuY29kZVVSSUNvbXBvbmVudChjaHJvbWUuaWRlbnRpdHkuZ2V0UmVkaXJlY3RVUkwoJ3Byb3ZpZGVyX2NiJykpfSZzY29wZT1wcm9maWxlIGVtYWlsYCxcclxuICAgICAgICAgICAgICAgIGludGVyYWN0aXZlOiB0cnVlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIChyZWRpcmVjdFVybCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJMb2dpbiBmYWlsZWQ6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobmV3IFVSTChyZWRpcmVjdFVybCkuaGFzaC5zdWJzdHJpbmcoMSkpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYWNjZXNzVG9rZW4gPSBwYXJhbXMuZ2V0KFwiYWNjZXNzX3Rva2VuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIENhbGwgR29vZ2xlIFVzZXIgSW5mbyBBUElcclxuICAgICAgICAgICAgICAgIGZldGNoKFwiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YyL3VzZXJpbmZvXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHthY2Nlc3NUb2tlbn1gLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGFzeW5jIHVzZXJJbmZvID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJVc2VyIGluZm86XCIsIHVzZXJJbmZvKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlbmQgdG8gRmlyZWJhc2UgQVBJIG9yIEZpcmVzdG9yZSBlbnRyeVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVPQXV0aFN1Y2Nlc3ModXNlckluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVVzZXJUb0ZpcmVzdG9yZSh1c2VySW5mbylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVzZXIgc2F2ZWRcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NoZWNrTG9naW5Gcm9tQ2xpZW50KHVzZXJJbmZvLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2hhbmRsZU9BdXRoU3VjY2Vzcyh1c2VySW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXdhaXQgc2V0RG9jKGRvYyhkYiwgXCJ1c2Vyc1wiLCB1c2VySW5mby5pZCksIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIG5hbWU6IHVzZXJJbmZvLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBlbWFpbDogdXNlckluZm8uZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBwaWN0dXJlOiB1c2VySW5mby5waWN0dXJlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgbG9nZ2VkSW5BdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPUjogU2VuZCB0byB5b3VyIG93biBiYWNrZW5kIGVuZHBvaW50XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuXHJcblxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIFxyXG4gICAgLy8gU2lnbiBPdXQgYnV0dG9uXHJcbiAgICBjb25zdCBzaWduT3V0QnRuID0gJCgnI3NpZ24tb3V0LWJ0bicpO1xyXG4gICAgaWYgKHNpZ25PdXRCdG4ubGVuZ3RoKSB7XHJcbiAgICAgICAgc2lnbk91dEJ0bi5vbignY2xpY2snLCBoYW5kbGVTaWduT3V0KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBPcGVuIFBob3RvcyBidXR0b25cclxuICAgIGNvbnN0IG9wZW5QaG90b3NCdG4gPSAkKCcjb3Blbi1waG90b3MtYnRuJyk7XHJcbiAgICBpZiAob3BlblBob3Rvc0J0bi5sZW5ndGgpIHtcclxuICAgICAgICBvcGVuUGhvdG9zQnRuLm9uKCdjbGljaycsIGhhbmRsZU9wZW5QaG90b3MpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERvd25sb2FkIFJlY2VpcHQgYnV0dG9uXHJcbiAgICBjb25zdCBkb3dubG9hZFJlY2VpcHRCdG4gPSAkKCcjZG93bmxvYWQtcmVjZWlwdC1idG4nKTtcclxuICAgIGlmIChkb3dubG9hZFJlY2VpcHRCdG4ubGVuZ3RoKSB7XHJcbiAgICAgICAgZG93bmxvYWRSZWNlaXB0QnRuLm9uKCdjbGljaycsIGhhbmRsZURvd25sb2FkUmVjZWlwdCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3VwcG9ydCBidXR0b25cclxuICAgIGNvbnN0IHN1cHBvcnRCdG4gPSAkKCcjc3VwcG9ydC1idG4nKTtcclxuICAgIGlmIChzdXBwb3J0QnRuLmxlbmd0aCkge1xyXG4gICAgICAgIHN1cHBvcnRCdG4ub24oJ2NsaWNrJywgaGFuZGxlU3VwcG9ydCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQnV5IFBybyBidXR0b25cclxuICAgIGNvbnN0IGJ1eVByb0J0biA9ICQoJyNidXktcHJvLWJ0bicpO1xyXG4gICAgaWYgKGJ1eVByb0J0bi5sZW5ndGgpIHtcclxuICAgICAgICBidXlQcm9CdG4ub24oJ2NsaWNrJywgaGFuZGxlQnV5UHJvKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGb290ZXIgbGlua3NcclxuICAgIC8vc2V0dXBGb290ZXJMaW5rcygpO1xyXG59XHJcblxyXG5cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVNpZ25JbigpIHtcclxuICAgIGNvbnN0IHNpZ25JbkJ0biA9ICQoJyNzaWduLWluLWJ0bicpO1xyXG4gICAgaWYgKHNpZ25JbkJ0bikge1xyXG4gICAgICAgIHNpZ25JbkJ0bi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjwvZGl2PiBPcGVuaW5nIEdvb2dsZSBPQXV0aC4uLic7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBVc2UgdGhlIG5ldyBwb2xsaW5nLWJhc2VkIE9BdXRoIGZsb3dcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgICAgICAgIGFjdGlvbjogJ2F1dGhlbnRpY2F0ZSdcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBidXR0b24gdG8gc2hvdyBwb2xsaW5nIHN0YXR1c1xyXG4gICAgICAgICAgICBpZiAoc2lnbkluQnRuKSB7XHJcbiAgICAgICAgICAgICAgICBzaWduSW5CdG4uaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+IENvbXBsZXRlIHNpZ24taW4gaW4gdGhlIG9wZW5lZCB0YWIuLi4nO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBUaGUgT0F1dGggaGVscGVyIHdpbGwgaGFuZGxlIHBvbGxpbmcgYW5kIHVwZGF0ZSBzdG9yYWdlXHJcbiAgICAgICAgICAgIC8vIFdlJ2xsIGdldCBub3RpZmllZCB2aWEgdGhlIGF1dGhlbnRpY2F0aW9uQ29tcGxldGUgbWVzc2FnZVxyXG4gICAgICAgICAgICBzaG93U3VjY2VzcygnQXV0aGVudGljYXRpb24gdGFiIG9wZW5lZCEgUGxlYXNlIGNvbXBsZXRlIHNpZ24taW4gaW4gdGhlIG5ldyB0YWIuJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCAnQXV0aGVudGljYXRpb24gZmFpbGVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdTaWduIGluIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgICBzaG93RXJyb3IoJ0ZhaWxlZCB0byBzdGFydCBhdXRoZW50aWNhdGlvbi4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuXHJcbiAgICAgICAgLy8gUmVzZXQgYnV0dG9uXHJcbiAgICAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4gICAgICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICfwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGUnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlU2lnbk91dCgpIHtcclxuICAgIGNvbnN0IHNpZ25PdXRCdG4gPSAkKCcjc2lnbi1vdXQtYnRuJyk7XHJcbiAgICBpZiAoc2lnbk91dEJ0bikge1xyXG4gICAgICAgIHNpZ25PdXRCdG4uZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIHNpZ25PdXRCdG4uaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+IFNpZ25pbmcgb3V0Li4uJztcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIC8vIENsZWFyIHN0b3JlZCB1c2VyIGRhdGEgYW5kIHBheW1lbnQgc3RhdHVzXHJcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKFtcclxuICAgICAgICAgICAgICAgICd1c2VyRW1haWwnLFxyXG4gICAgICAgICAgICAgICAgJ3VzZXJJZCcsXHJcbiAgICAgICAgICAgICAgICAnaXNQYWlkVmVyc2lvbicsXHJcbiAgICAgICAgICAgICAgICAnbGFzdFBhaWRTdGF0dXNDaGVjaycsXHJcbiAgICAgICAgICAgICAgICAncGF5bWVudERhdGEnXHJcbiAgICAgICAgICAgIF0sIHJlc29sdmUpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBVcGRhdGUgVUkgdG8gc2hvdyBzaWduZWQtb3V0IHN0YXRlXHJcbiAgICAgICAgYXdhaXQgdXBkYXRlQXV0aFNlY3Rpb24oe30pO1xyXG5cclxuICAgICAgICAvLyBSZS1zZXR1cCBldmVudCBsaXN0ZW5lcnMgZm9yIHRoZSBuZXcgYnV0dG9uc1xyXG4gICAgICAgIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHJcbiAgICAgICAgLy8gVXBkYXRlIGFwcCB0aXRsZSB0byBmcmVlIHZlcnNpb25cclxuICAgICAgICB1cGRhdGVBcHBUaXRsZShmYWxzZSk7XHJcblxyXG4gICAgICAgIC8vIE5vdGlmeSBjb250ZW50IHNjcmlwdCBhYm91dCB0aGUgc3RhdHVzIGNoYW5nZVxyXG4gICAgICAgIG5vdGlmeUNvbnRlbnRTY3JpcHQoKTtcclxuXHJcbiAgICAgICAgc2hvd1N1Y2Nlc3MoJ1N1Y2Nlc3NmdWxseSBzaWduZWQgb3V0IScpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdTaWduIG91dCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgc2hvd0Vycm9yKCdGYWlsZWQgdG8gc2lnbiBvdXQuIFBsZWFzZSB0cnkgYWdhaW4uJyk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIGNvbnN0IHNpZ25PdXRCdG4gPSAkKCcjc2lnbi1vdXQtYnRuJyk7XHJcbiAgICAgICAgaWYgKHNpZ25PdXRCdG4pIHtcclxuICAgICAgICAgICAgc2lnbk91dEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzaWduT3V0QnRuLmlubmVySFRNTCA9ICfwn5qqIFNpZ24gT3V0JztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZU9wZW5QaG90b3MoKSB7XHJcbiAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6ICdodHRwczovL3Bob3Rvcy5nb29nbGUuY29tJyB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlRG93bmxvYWRSZWNlaXB0KCkge1xyXG4gICAgY29uc3QgZG93bmxvYWRCdG4gPSAkKCcjZG93bmxvYWQtcmVjZWlwdC1idG4nKTtcclxuICAgIGlmIChkb3dubG9hZEJ0bikge1xyXG4gICAgICAgIGRvd25sb2FkQnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICBkb3dubG9hZEJ0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gR2V0dGluZyBpbnZvaWNlLi4uJztcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OEIERvd25sb2FkaW5nIGludm9pY2UuLi4nKTtcclxuXHJcbiAgICAgICAgLy8gR2V0IHVzZXIgZGF0YVxyXG4gICAgICAgIGNvbnN0IHVzZXJEYXRhID0gYXdhaXQgZ2V0VXNlckRhdGEoKTtcclxuICAgICAgICBpZiAoIXVzZXJEYXRhLnVzZXJFbWFpbCB8fCAhdXNlckRhdGEudXNlcklkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNpZ24gaW4gZmlyc3QgdG8gZG93bmxvYWQgcmVjZWlwdCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gR2VuZXJhdGUgYXV0aCBoYXNoXHJcbiAgICAgICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuICAgICAgICAgICAgYWN0aW9uOiAnZ2VuZXJhdGVBdXRoSGFzaCcsXHJcbiAgICAgICAgICAgIGFjY291bnRJZDogdXNlckRhdGEudXNlcklkLFxyXG4gICAgICAgICAgICBleHRlbnNpb25JZDogY2hyb21lLnJ1bnRpbWUuaWRcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKCFhdXRoUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgYXV0aGVudGljYXRpb24nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlcXVlc3QgaW52b2ljZSBVUkwgZnJvbSBzZXJ2ZXJcclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5ncGRybS5jb20vZG93bmxvYWQtaW52b2ljZScsIHtcclxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgIGFjY291bnRJZDogdXNlckRhdGEudXNlcklkLFxyXG4gICAgICAgICAgICAgICAgZW1haWw6IHVzZXJEYXRhLnVzZXJFbWFpbCxcclxuICAgICAgICAgICAgICAgIGF1dGhIYXNoOiBhdXRoUmVzdWx0LmF1dGhIYXNoLFxyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uSWQ6IGNocm9tZS5ydW50aW1lLmlkXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmIChyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRhdGEuaW52b2ljZVVybCkge1xyXG4gICAgICAgICAgICAgICAgLy8gT3BlbiBTdHJpcGUgaG9zdGVkIGludm9pY2UgaW4gbmV3IHRhYlxyXG4gICAgICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBkYXRhLmludm9pY2VVcmwgfSk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIE9wZW5lZCBTdHJpcGUgaG9zdGVkIGludm9pY2U6JywgZGF0YS5pbnZvaWNlVXJsKTtcclxuICAgICAgICAgICAgICAgIHNob3dTdWNjZXNzKCdJbnZvaWNlIG9wZW5lZCBpbiBuZXcgdGFiIScpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZvaWNlIFVSTCBub3QgYXZhaWxhYmxlJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBlcnJvckRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvckRhdGEuZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZXQgaW52b2ljZScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Rvd25sb2FkIHJlY2VpcHQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICAgIHNob3dFcnJvcihlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gZG93bmxvYWQgcmVjZWlwdC4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgaWYgKGRvd25sb2FkQnRuKSB7XHJcbiAgICAgICAgICAgIGRvd25sb2FkQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGRvd25sb2FkQnRuLmlubmVySFRNTCA9ICfwn5OEIERvd25sb2FkIFJlY2VpcHQnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlU3VwcG9ydCgpIHtcclxuICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogJ2h0dHBzOi8vdC5tZS9ncGRybV9zdXBwb3J0JyB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQnV5UHJvKCkge1xyXG4gICAgY29uc3QgYnV5UHJvQnRuID0kKCcjYnV5LXByby1idG4nKTtcclxuICAgIGlmIChidXlQcm9CdG4pIHtcclxuICAgICAgICBidXlQcm9CdG4uZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIGJ1eVByb0J0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gT3BlbmluZyBwdXJjaGFzZS4uLic7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBHZXQgdXNlciBpbmZvIGZvciBwdXJjaGFzZVxyXG4gICAgICAgIGNvbnN0IHVzZXJEYXRhID0gYXdhaXQgZ2V0VXNlckRhdGEoKTtcclxuICAgICAgICBpZiAoIXVzZXJEYXRhLnVzZXJFbWFpbCB8fCAhdXNlckRhdGEudXNlcklkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNpZ24gaW4gZmlyc3QgdG8gcHVyY2hhc2UgUHJvIHZlcnNpb24nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEdlbmVyYXRlIGF1dGggaGFzaCBhbmQgb3BlbiBwdXJjaGFzZSBwYWdlXHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICBhY3Rpb246ICdnZW5lcmF0ZUF1dGhIYXNoJyxcclxuICAgICAgICAgICAgYWNjb3VudElkOiB1c2VyRGF0YS51c2VySWQsXHJcbiAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgY29uc3QgcHVyY2hhc2VVcmwgPSBgaHR0cHM6Ly9hcGkuZ3Bkcm0uY29tL3B1cmNoYXNlP2FjY291bnRJZD0ke2VuY29kZVVSSUNvbXBvbmVudCh1c2VyRGF0YS51c2VySWQpfSZlbWFpbD0ke2VuY29kZVVSSUNvbXBvbmVudCh1c2VyRGF0YS51c2VyRW1haWwpfSZhdXRoSGFzaD0ke2VuY29kZVVSSUNvbXBvbmVudChyZXN1bHQuYXV0aEhhc2gpfSZleHRlbnNpb25JZD0ke2VuY29kZVVSSUNvbXBvbmVudChjaHJvbWUucnVudGltZS5pZCl9YDtcclxuXHJcbiAgICAgICAgICAgIC8vIE9wZW4gcHVyY2hhc2UgcGFnZVxyXG4gICAgICAgICAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6IHB1cmNoYXNlVXJsIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gVXBkYXRlIGJ1dHRvbiB0byBzaG93IHBvbGxpbmcgc3RhdHVzXHJcbiAgICAgICAgICAgIGlmIChidXlQcm9CdG4pIHtcclxuICAgICAgICAgICAgICAgIGJ1eVByb0J0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gQ29tcGxldGUgcHVyY2hhc2UgaW4gdGhlIG9wZW5lZCB0YWIuLi4nO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzaG93U3VjY2VzcygnUHVyY2hhc2UgcGFnZSBvcGVuZWQhIENvbXBsZXRlIHlvdXIgcHVyY2hhc2UgaW4gdGhlIG5ldyB0YWIuJyk7XHJcblxyXG4gICAgICAgICAgICAvLyBTdGFydCBwb2xsaW5nIGZvciBwYXltZW50IGNvbXBsZXRpb25cclxuICAgICAgICAgICAgc3RhcnRQdXJjaGFzZVBvbGxpbmcodXNlckRhdGEpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZXN1bHQuZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZW5lcmF0ZSBwdXJjaGFzZSBsaW5rJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdCdXkgUHJvIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgICBzaG93RXJyb3IoZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIG9wZW4gcHVyY2hhc2UgcGFnZS4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuXHJcbiAgICAgICAgLy8gUmVzZXQgYnV0dG9uIG9uIGVycm9yXHJcbiAgICAgICAgaWYgKGJ1eVByb0J0bikge1xyXG4gICAgICAgICAgICBidXlQcm9CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgYnV5UHJvQnRuLmlubmVySFRNTCA9ICfwn5KOIEJ1eSBQcm8nO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc3RhcnRQdXJjaGFzZVBvbGxpbmcodXNlckRhdGEpIHtcclxuICAgIGNvbnNvbGUubG9nKCfwn5SEIFN0YXJ0aW5nIHB1cmNoYXNlIHBvbGxpbmcgZm9yIHVzZXI6JywgdXNlckRhdGEudXNlckVtYWlsKTtcclxuXHJcbiAgICBjb25zdCBtYXhBdHRlbXB0cyA9IDE4MDsgLy8gMyBtaW51dGVzICgxODAgc2Vjb25kcykgd2l0aCAxLXNlY29uZCBpbnRlcnZhbHNcclxuICAgIGxldCBhdHRlbXB0cyA9IDA7XHJcblxyXG4gICAgY29uc3QgcG9sbEludGVydmFsID0gc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGF0dGVtcHRzKys7XHJcbiAgICAgICAgY29uc29sZS5sb2coYPCflI0gUHVyY2hhc2UgcG9sbGluZyBhdHRlbXB0ICR7YXR0ZW1wdHN9LyR7bWF4QXR0ZW1wdHN9YCk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIHBheW1lbnQgc3RhdHVzIHVzaW5nIGV4aXN0aW5nIGVuZHBvaW50XHJcbiAgICAgICAgICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdnZW5lcmF0ZUF1dGhIYXNoJyxcclxuICAgICAgICAgICAgICAgIGFjY291bnRJZDogdXNlckRhdGEudXNlcklkLFxyXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uSWQ6IGNocm9tZS5ydW50aW1lLmlkXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFhdXRoUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIGF1dGggaGFzaCcpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5ncGRybS5jb20vY2hlY2stcGF5bWVudC1zdGF0dXMnLCB7XHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBhY2NvdW50SWQ6IHVzZXJEYXRhLnVzZXJJZCxcclxuICAgICAgICAgICAgICAgICAgICBlbWFpbDogdXNlckRhdGEudXNlckVtYWlsLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dGhIYXNoOiBhdXRoUmVzdWx0LmF1dGhIYXNoLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuaXNQYWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUGF5bWVudCBjb21wbGV0ZWQhXHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChwb2xsSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGhhbmRsZVB1cmNoYXNlQ29tcGxldGUoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBDb250aW51ZSBwb2xsaW5nIGlmIHBheW1lbnQgbm90IGNvbXBsZXRlZCB5ZXRcclxuICAgICAgICAgICAgaWYgKGF0dGVtcHRzID49IG1heEF0dGVtcHRzKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUaW1lb3V0IHJlYWNoZWRcclxuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwocG9sbEludGVydmFsKTtcclxuICAgICAgICAgICAgICAgIGhhbmRsZVB1cmNoYXNlVGltZW91dCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBQdXJjaGFzZSBwb2xsaW5nIGVycm9yOicsIGVycm9yKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENvbnRpbnVlIHBvbGxpbmcgdW5sZXNzIHdlJ3ZlIHJlYWNoZWQgbWF4IGF0dGVtcHRzXHJcbiAgICAgICAgICAgIGlmIChhdHRlbXB0cyA+PSBtYXhBdHRlbXB0cykge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChwb2xsSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgaGFuZGxlUHVyY2hhc2VUaW1lb3V0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LCAxMDAwKTsgLy8gUG9sbCBldmVyeSBzZWNvbmRcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUHVyY2hhc2VDb21wbGV0ZShwYXltZW50RGF0YSkge1xyXG4gICAgY29uc29sZS5sb2coJ+KchSBQdXJjaGFzZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IScpO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBsb2NhbCBzdG9yYWdlIHdpdGggcGF5bWVudCBkYXRhXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XHJcbiAgICAgICAgICAgIGlzUGFpZFZlcnNpb246IHRydWUsXHJcbiAgICAgICAgICAgIGxhc3RQYWlkU3RhdHVzQ2hlY2s6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgIHBheW1lbnREYXRhOiBwYXltZW50RGF0YS5wYXltZW50RGF0YSB8fCBudWxsXHJcbiAgICAgICAgfSwgcmVzb2x2ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVcGRhdGUgVUlcclxuICAgIHVwZGF0ZVZlcnNpb25TdGF0dXModHJ1ZSk7XHJcbiAgICAvL3VwZGF0ZUJ1eVByb0J1dHRvbih0cnVlKTtcclxuXHJcbiAgICAvLyBSZWZyZXNoIGF1dGggc2VjdGlvbiB0byBzaG93IFBybyBidXR0b25zXHJcbiAgICBjb25zdCB1c2VyRGF0YSA9IGF3YWl0IGdldFVzZXJEYXRhKCk7XHJcbiAgICBhd2FpdCB1cGRhdGVBdXRoU2VjdGlvbih1c2VyRGF0YSk7XHJcblxyXG4gICAgLy8gUmUtc2V0dXAgZXZlbnQgbGlzdGVuZXJzIGZvciB0aGUgbmV3IGJ1dHRvbnNcclxuICAgIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHJcbiAgICAvLyBSZXNldCBCdXkgUHJvIGJ1dHRvbiAoaWYgaXQgc3RpbGwgZXhpc3RzKVxyXG4gICAgY29uc3QgYnV5UHJvQnRuID0gJCgnI2J1eS1wcm8tYnRuJyk7XHJcbiAgICBpZiAoYnV5UHJvQnRuKSB7XHJcbiAgICAgICAgYnV5UHJvQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgYnV5UHJvQnRuLmlubmVySFRNTCA9ICfwn5KOIEJ1eSBQcm8nO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5vdGlmeSBjb250ZW50IHNjcmlwdFxyXG4gICAgbm90aWZ5Q29udGVudFNjcmlwdCgpO1xyXG5cclxuICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlXHJcbiAgICBzaG93U3VjY2Vzcygn8J+OiSBQdXJjaGFzZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5ISBQcm8gZmVhdHVyZXMgYXJlIG5vdyBhY3RpdmUuJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZVB1cmNoYXNlVGltZW91dCgpIHtcclxuICAgIGNvbnNvbGUubG9nKCfij7AgUHVyY2hhc2UgcG9sbGluZyB0aW1lZCBvdXQnKTtcclxuXHJcbiAgICAvLyBSZXNldCBCdXkgUHJvIGJ1dHRvblxyXG4gICAgY29uc3QgYnV5UHJvQnRuID0gJCgnI2J1eS1wcm8tYnRuJyk7XHJcbiAgICBpZiAoYnV5UHJvQnRuKSB7XHJcbiAgICAgICAgYnV5UHJvQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgYnV5UHJvQnRuLmlubmVySFRNTCA9ICfwn5KOIEJ1eSBQcm8nO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNob3cgdGltZW91dCBtZXNzYWdlXHJcbiAgICBzaG93RXJyb3IoJ1B1cmNoYXNlIHBvbGxpbmcgdGltZWQgb3V0LiBJZiB5b3UgY29tcGxldGVkIHRoZSBwdXJjaGFzZSwgcGxlYXNlIHJlZnJlc2ggdGhlIHBhZ2Ugb3IgcmVzdGFydCB0aGUgZXh0ZW5zaW9uLicpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93U3VjY2VzcyhtZXNzYWdlKSB7XHJcbiAgICBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdzdWNjZXNzJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dFcnJvcihtZXNzYWdlKSB7XHJcbiAgICBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdlcnJvcicpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2UsIHR5cGUgPSAnaW5mbycpIHtcclxuICAgIC8vIENyZWF0ZSBub3RpZmljYXRpb24gZWxlbWVudFxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICBub3RpZmljYXRpb24uY2xhc3NOYW1lID0gYG5vdGlmaWNhdGlvbiBub3RpZmljYXRpb24tJHt0eXBlfWA7XHJcbiAgICBub3RpZmljYXRpb24udGV4dENvbnRlbnQgPSBtZXNzYWdlO1xyXG5cclxuICAgIC8vIEFkZCBzdHlsZXNcclxuICAgIE9iamVjdC5hc3NpZ24obm90aWZpY2F0aW9uLnN0eWxlLCB7XHJcbiAgICAgICAgcG9zaXRpb246ICdmaXhlZCcsXHJcbiAgICAgICAgdG9wOiAnMjBweCcsXHJcbiAgICAgICAgcmlnaHQ6ICcyMHB4JyxcclxuICAgICAgICBwYWRkaW5nOiAnMTJweCAyMHB4JyxcclxuICAgICAgICBib3JkZXJSYWRpdXM6ICc4cHgnLFxyXG4gICAgICAgIGNvbG9yOiAnd2hpdGUnLFxyXG4gICAgICAgIGZvbnRXZWlnaHQ6ICc1MDAnLFxyXG4gICAgICAgIHpJbmRleDogJzEwMDAwJyxcclxuICAgICAgICB0cmFuc2Zvcm06ICd0cmFuc2xhdGVYKDEwMCUpJyxcclxuICAgICAgICB0cmFuc2l0aW9uOiAndHJhbnNmb3JtIDAuM3MgZWFzZScsXHJcbiAgICAgICAgbWF4V2lkdGg6ICczMDBweCcsXHJcbiAgICAgICAgd29yZFdyYXA6ICdicmVhay13b3JkJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2V0IGJhY2tncm91bmQgY29sb3IgYmFzZWQgb24gdHlwZVxyXG4gICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgY2FzZSAnc3VjY2Vzcyc6XHJcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzM0YTg1Myc7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcclxuICAgICAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjZWE0MzM1JztcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjNDI4NWY0JztcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgdG8gcGFnZVxyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub3RpZmljYXRpb24pO1xyXG5cclxuICAgIC8vIEFuaW1hdGUgaW5cclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgwKSc7XHJcbiAgICB9LCAxMDApO1xyXG5cclxuICAgIC8vIFJlbW92ZSBhZnRlciBkZWxheVxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDEwMCUpJztcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbi5wYXJlbnROb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBub3RpZmljYXRpb24ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub3RpZmljYXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMzAwKTtcclxuICAgIH0sIDMwMDApO1xyXG59XHJcblxyXG4vLyBMaXN0ZW4gZm9yIHN0b3JhZ2UgY2hhbmdlcyB0byB1cGRhdGUgVUlcclxuY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKChjaGFuZ2VzLCBuYW1lc3BhY2UpID0+IHtcclxuICAgIGlmIChuYW1lc3BhY2UgPT09ICdsb2NhbCcpIHtcclxuICAgICAgICBpZiAoY2hhbmdlcy51c2VyRW1haWwgfHwgY2hhbmdlcy51c2VySWQpIHtcclxuICAgICAgICAgICAgLy8gUmVmcmVzaCBhdXRoIHNlY3Rpb24gd2hlbiB1c2VyIGRhdGEgY2hhbmdlc1xyXG4gICAgICAgICAgICBnZXRVc2VyRGF0YSgpLnRoZW4oYXN5bmMgdXNlckRhdGEgPT4ge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlQXV0aFNlY3Rpb24odXNlckRhdGEpO1xyXG4gICAgICAgICAgICAgICAgLy8gUmUtc2V0dXAgZXZlbnQgbGlzdGVuZXJzIGZvciB0aGUgbmV3IGJ1dHRvbnNcclxuICAgICAgICAgICAgICAgIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2hhbmdlcy5pc1BhaWRWZXJzaW9uKSB7XHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2ZXJzaW9uIHN0YXR1cyB3aGVuIHBheW1lbnQgc3RhdHVzIGNoYW5nZXNcclxuICAgICAgICAgICAgdXBkYXRlVmVyc2lvblN0YXR1cyhjaGFuZ2VzLmlzUGFpZFZlcnNpb24ubmV3VmFsdWUgfHwgZmFsc2UpO1xyXG4gICAgICAgICAgICAvL3VwZGF0ZUJ1eVByb0J1dHRvbihjaGFuZ2VzLmlzUGFpZFZlcnNpb24ubmV3VmFsdWUgfHwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG4vLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gYmFja2dyb3VuZCBzY3JpcHRcclxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGFzeW5jIChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4gICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnYXV0aGVudGljYXRpb25Db21wbGV0ZScpIHtcclxuICAgICAgICAvLyBSZWZyZXNoIHRoZSBwYWdlIHdoZW4gYXV0aGVudGljYXRpb24gY29tcGxldGVzXHJcbiAgICAgICAgY29uc3QgdXNlckRhdGEgPSBhd2FpdCBnZXRVc2VyRGF0YSgpO1xyXG4gICAgICAgIGF3YWl0IHVwZGF0ZUF1dGhTZWN0aW9uKHVzZXJEYXRhKTtcclxuXHJcbiAgICAgICAgLy8gUmUtc2V0dXAgZXZlbnQgbGlzdGVuZXJzIGZvciB0aGUgbmV3IGJ1dHRvbnNcclxuICAgICAgICBzZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcblxyXG4gICAgICAgIC8vIENoZWNrIHBheW1lbnQgc3RhdHVzIGZvciB0aGUgbmV3bHkgc2lnbmVkLWluIHVzZXJcclxuICAgICAgICBpZiAodXNlckRhdGEudXNlckVtYWlsICYmIHVzZXJEYXRhLnVzZXJJZCkge1xyXG4gICAgICAgICAgICAvL2F3YWl0IGNoZWNrUGF5bWVudFN0YXR1cyh1c2VyRGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzaG93U3VjY2VzcygnQXV0aGVudGljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKTtcclxuXHJcbiAgICAgICAgLy8gUmVzZXQgc2lnbi1pbiBidXR0b24gaWYgaXQgZXhpc3RzXHJcbiAgICAgICAgY29uc3Qgc2lnbkluQnRuID0gJCgnI3NpZ24taW4tYnRuJyk7XHJcbiAgICAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4gICAgICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICfwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGUnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG5mdW5jdGlvbiBub3RpZnlDb250ZW50U2NyaXB0KCkge1xyXG4gICAgLy8gTm90aWZ5IGFsbCB0YWJzIGFib3V0IHBheW1lbnQgc3RhdHVzIHVwZGF0ZVxyXG4gICAgY2hyb21lLnRhYnMucXVlcnkoe30sICh0YWJzKSA9PiB7XHJcbiAgICAgICAgdGFicy5mb3JFYWNoKHRhYiA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0YWIudXJsICYmIHRhYi51cmwuaW5jbHVkZXMoJ3Bob3Rvcy5nb29nbGUuY29tJykpIHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwge1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ3BheW1lbnRTdGF0dXNVcGRhdGVkJ1xyXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgZm9yIHRhYnMgd2l0aG91dCBjb250ZW50IHNjcmlwdFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59IFxyXG5cclxudmFyIGV4dGVuc2lvblBhZ2VPYmogPSB7XHJcbiAgICBhZGRFdmVudHM6IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgICAgICAkKGRvY3VtZW50KS5vbihcImNsaWNrXCIsICcjc2lnbi1vdXQtYnRuJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGhhbmRsZVNpZ25PdXQoKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkKGRvY3VtZW50KS5vbihcImNsaWNrXCIsICcjb3Blbi1waG90b3MtYnRuJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGhhbmRsZU9wZW5QaG90b3MoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xyXG4gICAgZXh0ZW5zaW9uUGFnZU9iai5hZGRFdmVudHMoKTtcclxufSkiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=