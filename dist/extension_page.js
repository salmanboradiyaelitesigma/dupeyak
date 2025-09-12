/******/ (() => { // webpackBootstrap
/*!**********************************!*\
  !*** ./src/js/extension-page.js ***!
  \**********************************/
// // Initialize Firebase
// //client ka
// const firebaseConfig = {
//   apiKey: "AIzaSyCC6SilBsdYgtJVL2LGLiewhJXMaNqMrWI",
//   authDomain: "dupeyaktest.firebaseapp.com",
//   projectId: "dupeyaktest",
//   storageBucket: "dupeyaktest.firebasestorage.app",
//   messagingSenderId: "820990403204",
//   appId: "1:820990403204:web:2a850c95d9d1e3848ed8d1",
//   measurementId: "G-9R53SDE1HY"
// };


// // ✅ Initialize Firebase
// const app = firebase.initializeApp(firebaseConfig);
// const auth = firebase.auth();
// const db = firebase.firestore();
// const setDoc = firebase.firestore();
// const doc = firebase.firestore();


// async function saveUserToFirestore(userInfo) {
//      return db.collection("users").doc(userInfo.id).set({
//     name: userInfo.name,
//     email: userInfo.email,
//     picture: userInfo.picture,
//     loggedInAt: new Date(),
//   });
// }


// async function handleOAuthSuccess(userInfo) {
//         try {
//             console.log('🔄 Processing OAuth success...');
//             // Store user info in extension storage
//             await new Promise((resolve) => {
//                 chrome.storage.local.set({
//                     userEmail: userInfo.email,
//                     userId: userInfo.id,
//                     authTimestamp: Date.now()
//                 }, resolve);
//             });
//             console.log('✅ User info stored:', userInfo.email);
//             //await updateAuthSection(userInfo);
//         } catch (error) {
//             console.error('❌ Failed to handle OAuth success:', error);
//             throw error;
//         }
//     }
// // Extension Page JavaScript
// document.addEventListener('DOMContentLoaded', function () {
//     console.log('Extension page loaded');

//     // Initialize the page
//     initializePage();
// });

// async function initializePage() {
//     try {
//         // Update version from manifest
//         updateVersionDisplay();

//         // Check authentication status and update UI
//         const userData = await getUserData();
//         await updateAuthSection(userData);

//         // Check payment status if user is signed in
//         if (userData.userEmail && userData.userId) {
//             //await checkPaymentStatus(userData);
//         } else {
//             // Set up event listeners for signed-out state
//             setupEventListeners();
//         }

//     } catch (error) {
//         console.error('Error initializing page:', error);
//         showError('Failed to initialize extension page');
//     }
// }

// function updateVersionDisplay() {
//     const versionElement = $('#extension-version');
//     if (versionElement) {
//         // Get version from manifest
//         const manifest = chrome.runtime.getManifest();
//         versionElement.textContent = `v${manifest.version}`;
//         console.log('📋 Extension version:', manifest.version);
//     }
// }

// function updateAppTitle(isPro = false) {
//     const titleElement = $('#app-title');
//     if (titleElement) {
//         if (isPro) {
//             titleElement.innerHTML = 'DupeYak Duplicate Remover <span class="pro-badge">PRO</span>';
//         } else {
//             titleElement.textContent = 'DupeYak Duplicate Remover';
//         }
//     }
// }

// function updateVersionStatus(isPro = false) {
//     // Update app title with pro status
//     updateAppTitle(isPro);

//     // Update version display
//     updateVersionDisplay();

//     // Log the status change
//     console.log('📊 Version status updated:', isPro ? 'PRO' : 'FREE');
// }

// async function checkPaymentStatus(userData) {
//     try {
//         console.log('🔍 Checking payment status for user:', userData.userEmail);

//         // Generate auth hash for verification
//         const result = await chrome.runtime.sendMessage({
//             action: 'generateAuthHash',
//             accountId: userData.userId,
//             extensionId: chrome.runtime.id
//         });

//         if (!result.success) {
//             throw new Error('Failed to generate auth hash');
//         }

//         // Check payment status with server
//         const response = await fetch('https://api.gpdrm.com/check-payment-status', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 accountId: userData.userId,
//                 email: userData.userEmail,
//                 authHash: result.authHash,
//                 extensionId: chrome.runtime.id
//             })
//         });

//         if (response.ok) {
//             const data = await response.json();
//             // const isPaid = data.isPaid || false;
//              const isPaid = true;


//             console.log('✅ Payment status check complete:', isPaid ? 'PAID' : 'FREE');

//             // Update local storage
//             await new Promise((resolve) => {
//                 chrome.storage.local.set({
//                     isPaidVersion: isPaid,
//                     lastPaidStatusCheck: Date.now(),
//                     paymentData: data.paymentData || null
//                 }, resolve);
//             });

//             // Update app title with pro badge
//             updateAppTitle(isPaid);

//             // Update Buy Pro button visibility
//             //updateBuyProButton(isPaid);

//             // Refresh the auth section with updated payment status
//             await updateAuthSection(userData);

//             // Re-setup event listeners since we recreated the buttons
//             setupEventListeners();

//             // Notify content script of status update
//             notifyContentScript();

//         } else {
//             console.warn('⚠️ Payment status check failed:', response.status);
//             // Fall back to local storage
//             const localData = await new Promise((resolve) => {
//                 chrome.storage.local.get(['isPaidVersion'], resolve);
//             });
//             updateAppTitle(localData.isPaidVersion || false);
//         }

//     } catch (error) {
//         console.error('❌ Error checking payment status:', error);
//         // Fall back to local storage
//         const localData = await new Promise((resolve) => {
//             chrome.storage.local.get(['isPaidVersion'], resolve);
//         });
//         updateAppTitle(localData.isPaidVersion || false);
//     }
// }



// // function updateBuyProButton(isPaid) {
// //     const buyProBtn = $('#buy-pro-btn');
// //     if (buyProBtn) {
// //         if (isPaid) {
// //             buyProBtn.style.display = 'none';
// //         } else {
// //             buyProBtn.style.display = 'inline-flex';
// //         }
// //     }
// // }

// async function getUserData() {
//     return new Promise((resolve) => {
//         chrome.storage.local.get(['userEmail', 'userId'], (result) => {
//             resolve(result);
//         });
//     });
// }

// async function updateAuthSection(userInfo) {
//     const accountSection = document.querySelector('.account-section');

//     if (userInfo.userEmail && userInfo.userId) {
//         // User is signed in - get Pro status from storage
//         const storageData = await new Promise((resolve) => {
//             chrome.storage.local.get(['isPaidVersion'], resolve);
//         });
//         const isPro = storageData.isPaidVersion || false;

//         accountSection.innerHTML = createSignedInHTML(userInfo.userEmail, isPro);

//         // Update app title with pro status
//         updateAppTitle(isPro);
//     } else {
//         // User is not signed in
//         accountSection.innerHTML = createSignInHTML();

//         // Set app title to free when not signed in
//         updateAppTitle(false);
//     }
// }

// function createSignedInHTML(email, isPro = false) {
//     // Build the buttons array conditionally
//     const buttons = [
//         `<button class="btn btn-secondary" id="open-photos-btn">
//             📸 Open Google Photos
//         </button>`
//     ];

//     // Add Pro-only buttons if user has Pro
//     if (isPro) {
//         buttons.push(`<button class="btn btn-secondary" id="download-receipt-btn">
//             📄 Download Receipt
//         </button>`);

//         buttons.push(`<button class="btn btn-secondary" id="support-btn">
//             💬 Contact Support
//         </button>`);
//     }

//     // Add Buy Pro button if user doesn't have Pro
//     // if (!isPro) {
//     //     buttons.push(`<button class="btn btn-primary" id="buy-pro-btn">
//     //         💎 Buy Pro
//     //     </button>`);
//     // }

//     // Always add Sign Out button
//     buttons.push(`<button class="btn btn-danger" id="sign-out-btn">
//         🚪 Sign Out
//     </button>`);

//     return `
//         <div class="account-info">
//             <div class="account-details">
//                 <div class="account-label">Signed in as:</div>
//                 <div class="account-email">${email}</div>
//             </div>
//             <div class="account-actions">
//                 ${buttons.join('\n                ')}
//             </div>
//         </div>
//     `;
// }

// function createSignInHTML() {
//     return `
//         <div class="signin-container">
//             <h2 class="signin-title">Welcome to DupeYak Duplicate Remover</h2>
//             <p class="signin-subtitle">Sign in with your Google account to get started, buy PRO or restore your license</p>
//             <button class="btn btn-primary" id="sign-in-btn">
//                 🔐 Sign in with Google
//             </button>
//         </div>
//     `;
// }

// function setupEventListeners() {
//     // Sign in button
//     // const signInBtn = $('#sign-in-btn');
//     // if (signInBtn.length) {
//     //     signInBtn.on('click', handleSignIn);
//     // }

//     document.getElementById("sign-in-btn").addEventListener("click", async () => {
        
//         //handleSignIn()
//         chrome.identity.launchWebAuthFlow(
//             {
//                 url: `https://accounts.google.com/o/oauth2/auth?client_id=904093800226-gdsb17l40m0cljstenr7muviigs5qa9k.apps.googleusercontent.com&response_type=token&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL('provider_cb'))}&scope=profile email`,
//                 interactive: true
//             },
//             function (redirectUrl) {
//                 if (chrome.runtime.lastError) {
//                     console.error("Login failed:", chrome.runtime.lastError);
//                     return;
//                 }

//                 const params = new URLSearchParams(new URL(redirectUrl).hash.substring(1));
//                 const accessToken = params.get("access_token");

//                 // Call Google User Info API
//                 fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
//                     headers: {
//                         Authorization: `Bearer ${accessToken}`,
//                     },
//                 })
//                     .then(res => res.json())
//                     .then(async userInfo => {
//                         console.log("User info:", userInfo);

//                         // Send to Firebase API or Firestore entry
//                         handleOAuthSuccess(userInfo);
                        
//                         saveUserToFirestore(userInfo)
//                             .then(() => {
//                                 console.log("User saved")
//                                 //checkLoginFromClient(userInfo.id);
//                                 //handleOAuthSuccess(userInfo);
//                             })
//                             .catch(console.error);

//                         // await setDoc(doc(db, "users", userInfo.id), {
//                         //     name: userInfo.name,
//                         //     email: userInfo.email,
//                         //     picture: userInfo.picture,
//                         //     loggedInAt: new Date(),
//                         // });

//                         // OR: Send to your own backend endpoint

//                     });
//             }
//         );


//     });


    
//     // Sign Out button
//     const signOutBtn = $('#sign-out-btn');
//     if (signOutBtn.length) {
//         signOutBtn.on('click', handleSignOut);
//     }

//     // Open Photos button
//     const openPhotosBtn = $('#open-photos-btn');
//     if (openPhotosBtn.length) {
//         openPhotosBtn.on('click', handleOpenPhotos);
//     }

//     // Download Receipt button
//     const downloadReceiptBtn = $('#download-receipt-btn');
//     if (downloadReceiptBtn.length) {
//         downloadReceiptBtn.on('click', handleDownloadReceipt);
//     }

//     // Support button
//     const supportBtn = $('#support-btn');
//     if (supportBtn.length) {
//         supportBtn.on('click', handleSupport);
//     }

//     // Buy Pro button
//     const buyProBtn = $('#buy-pro-btn');
//     if (buyProBtn.length) {
//         buyProBtn.on('click', handleBuyPro);
//     }

//     // Footer links
//     //setupFooterLinks();
// }



// async function handleSignIn() {
//     const signInBtn = $('#sign-in-btn');
//     if (signInBtn) {
//         signInBtn.disabled = true;
//         signInBtn.innerHTML = '<div class="spinner"></div> Opening Google OAuth...';
//     }

//     try {
//         // Use the new polling-based OAuth flow
//         const result = await chrome.runtime.sendMessage({
//             action: 'authenticate'
//         });

//         if (result.success) {
//             // Update button to show polling status
//             if (signInBtn) {
//                 signInBtn.innerHTML = '<div class="spinner"></div> Complete sign-in in the opened tab...';
//             }

//             // The OAuth helper will handle polling and update storage
//             // We'll get notified via the authenticationComplete message
//             showSuccess('Authentication tab opened! Please complete sign-in in the new tab.');
//         } else {
//             throw new Error(result.error || 'Authentication failed');
//         }
//     } catch (error) {
//         console.error('Sign in error:', error);
//         showError('Failed to start authentication. Please try again.');

//         // Reset button
//         if (signInBtn) {
//             signInBtn.disabled = false;
//             signInBtn.innerHTML = '🔐 Sign in with Google';
//         }
//     }
// }

// async function handleSignOut() {
//     const signOutBtn = $('#sign-out-btn');
//     if (signOutBtn) {
//         signOutBtn.disabled = true;
//         signOutBtn.innerHTML = '<div class="spinner"></div> Signing out...';
//     }

//     try {
//         // Clear stored user data and payment status
//         await new Promise((resolve) => {
//             chrome.storage.local.remove([
//                 'userEmail',
//                 'userId',
//                 'isPaidVersion',
//                 'lastPaidStatusCheck',
//                 'paymentData'
//             ], resolve);
//         });

//         // Update UI to show signed-out state
//         await updateAuthSection({});

//         // Re-setup event listeners for the new buttons
//         setupEventListeners();

//         // Update app title to free version
//         updateAppTitle(false);

//         // Notify content script about the status change
//         notifyContentScript();

//         showSuccess('Successfully signed out!');
//     } catch (error) {
//         console.error('Sign out error:', error);
//         showError('Failed to sign out. Please try again.');
//     } finally {
//         const signOutBtn = $('#sign-out-btn');
//         if (signOutBtn) {
//             signOutBtn.disabled = false;
//             signOutBtn.innerHTML = '🚪 Sign Out';
//         }
//     }
// }

// function handleOpenPhotos() {
//     chrome.tabs.create({ url: 'https://photos.google.com' });
// }

// async function handleDownloadReceipt() {
//     const downloadBtn = $('#download-receipt-btn');
//     if (downloadBtn) {
//         downloadBtn.disabled = true;
//         downloadBtn.innerHTML = '<div class="spinner"></div> Getting invoice...';
//     }

//     try {
//         console.log('📄 Downloading invoice...');

//         // Get user data
//         const userData = await getUserData();
//         if (!userData.userEmail || !userData.userId) {
//             throw new Error('Please sign in first to download receipt');
//         }

//         // Generate auth hash
//         const authResult = await chrome.runtime.sendMessage({
//             action: 'generateAuthHash',
//             accountId: userData.userId,
//             extensionId: chrome.runtime.id
//         });

//         if (!authResult.success) {
//             throw new Error('Failed to generate authentication');
//         }

//         // Request invoice URL from server
//         const response = await fetch('https://api.gpdrm.com/download-invoice', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 accountId: userData.userId,
//                 email: userData.userEmail,
//                 authHash: authResult.authHash,
//                 extensionId: chrome.runtime.id
//             })
//         });

//         if (response.ok) {
//             const data = await response.json();

//             if (data.invoiceUrl) {
//                 // Open Stripe hosted invoice in new tab
//                 chrome.tabs.create({ url: data.invoiceUrl });
//                 console.log('✅ Opened Stripe hosted invoice:', data.invoiceUrl);
//                 showSuccess('Invoice opened in new tab!');
//             } else {
//                 throw new Error('Invoice URL not available');
//             }
//         } else {
//             const errorData = await response.json();
//             throw new Error(errorData.error || 'Failed to get invoice');
//         }

//     } catch (error) {
//         console.error('Download receipt error:', error);
//         showError(error.message || 'Failed to download receipt. Please try again.');
//     } finally {
//         if (downloadBtn) {
//             downloadBtn.disabled = false;
//             downloadBtn.innerHTML = '📄 Download Receipt';
//         }
//     }
// }

// function handleSupport() {
//     chrome.tabs.create({ url: 'https://t.me/gpdrm_support' });
// }

// async function handleBuyPro() {
//     const buyProBtn =$('#buy-pro-btn');
//     if (buyProBtn) {
//         buyProBtn.disabled = true;
//         buyProBtn.innerHTML = '<div class="spinner"></div> Opening purchase...';
//     }

//     try {
//         // Get user info for purchase
//         const userData = await getUserData();
//         if (!userData.userEmail || !userData.userId) {
//             throw new Error('Please sign in first to purchase Pro version');
//         }

//         // Generate auth hash and open purchase page
//         const result = await chrome.runtime.sendMessage({
//             action: 'generateAuthHash',
//             accountId: userData.userId,
//             extensionId: chrome.runtime.id
//         });

//         if (result.success) {
//             const purchaseUrl = `https://api.gpdrm.com/purchase?accountId=${encodeURIComponent(userData.userId)}&email=${encodeURIComponent(userData.userEmail)}&authHash=${encodeURIComponent(result.authHash)}&extensionId=${encodeURIComponent(chrome.runtime.id)}`;

//             // Open purchase page
//             chrome.tabs.create({ url: purchaseUrl });

//             // Update button to show polling status
//             if (buyProBtn) {
//                 buyProBtn.innerHTML = '<div class="spinner"></div> Complete purchase in the opened tab...';
//             }

//             showSuccess('Purchase page opened! Complete your purchase in the new tab.');

//             // Start polling for payment completion
//             startPurchasePolling(userData);
//         } else {
//             throw new Error(result.error || 'Failed to generate purchase link');
//         }
//     } catch (error) {
//         console.error('Buy Pro error:', error);
//         showError(error.message || 'Failed to open purchase page. Please try again.');

//         // Reset button on error
//         if (buyProBtn) {
//             buyProBtn.disabled = false;
//             buyProBtn.innerHTML = '💎 Buy Pro';
//         }
//     }
// }

// async function startPurchasePolling(userData) {
//     console.log('🔄 Starting purchase polling for user:', userData.userEmail);

//     const maxAttempts = 180; // 3 minutes (180 seconds) with 1-second intervals
//     let attempts = 0;

//     const pollInterval = setInterval(async () => {
//         attempts++;
//         console.log(`🔍 Purchase polling attempt ${attempts}/${maxAttempts}`);

//         try {
//             // Check payment status using existing endpoint
//             const authResult = await chrome.runtime.sendMessage({
//                 action: 'generateAuthHash',
//                 accountId: userData.userId,
//                 extensionId: chrome.runtime.id
//             });

//             if (!authResult.success) {
//                 throw new Error('Failed to generate auth hash');
//             }

//             const response = await fetch('https://api.gpdrm.com/check-payment-status', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     accountId: userData.userId,
//                     email: userData.userEmail,
//                     authHash: authResult.authHash,
//                     extensionId: chrome.runtime.id
//                 })
//             });

//             if (response.ok) {
//                 const data = await response.json();

//                 if (data.isPaid) {
//                     // Payment completed!
//                     clearInterval(pollInterval);
//                     await handlePurchaseComplete(data);
//                     return;
//                 }
//             }

//             // Continue polling if payment not completed yet
//             if (attempts >= maxAttempts) {
//                 // Timeout reached
//                 clearInterval(pollInterval);
//                 handlePurchaseTimeout();
//             }

//         } catch (error) {
//             console.error('❌ Purchase polling error:', error);

//             // Continue polling unless we've reached max attempts
//             if (attempts >= maxAttempts) {
//                 clearInterval(pollInterval);
//                 handlePurchaseTimeout();
//             }
//         }
//     }, 1000); // Poll every second
// }

// async function handlePurchaseComplete(paymentData) {
//     console.log('✅ Purchase completed successfully!');

//     // Update local storage with payment data
//     await new Promise((resolve) => {
//         chrome.storage.local.set({
//             isPaidVersion: true,
//             lastPaidStatusCheck: Date.now(),
//             paymentData: paymentData.paymentData || null
//         }, resolve);
//     });

//     // Update UI
//     updateVersionStatus(true);
//     //updateBuyProButton(true);

//     // Refresh auth section to show Pro buttons
//     const userData = await getUserData();
//     await updateAuthSection(userData);

//     // Re-setup event listeners for the new buttons
//     setupEventListeners();

//     // Reset Buy Pro button (if it still exists)
//     const buyProBtn = $('#buy-pro-btn');
//     if (buyProBtn) {
//         buyProBtn.disabled = false;
//         buyProBtn.innerHTML = '💎 Buy Pro';
//     }

//     // Notify content script
//     notifyContentScript();

//     // Show success message
//     showSuccess('🎉 Purchase completed successfully! Pro features are now active.');
// }

// function handlePurchaseTimeout() {
//     console.log('⏰ Purchase polling timed out');

//     // Reset Buy Pro button
//     const buyProBtn = $('#buy-pro-btn');
//     if (buyProBtn) {
//         buyProBtn.disabled = false;
//         buyProBtn.innerHTML = '💎 Buy Pro';
//     }

//     // Show timeout message
//     showError('Purchase polling timed out. If you completed the purchase, please refresh the page or restart the extension.');
// }

// function showSuccess(message) {
//     showNotification(message, 'success');
// }

// function showError(message) {
//     showNotification(message, 'error');
// }

// function showNotification(message, type = 'info') {
//     // Create notification element
//     const notification = document.createElement('div');
//     notification.className = `notification notification-${type}`;
//     notification.textContent = message;

//     // Add styles
//     Object.assign(notification.style, {
//         position: 'fixed',
//         top: '20px',
//         right: '20px',
//         padding: '12px 20px',
//         borderRadius: '8px',
//         color: 'white',
//         fontWeight: '500',
//         zIndex: '10000',
//         transform: 'translateX(100%)',
//         transition: 'transform 0.3s ease',
//         maxWidth: '300px',
//         wordWrap: 'break-word'
//     });

//     // Set background color based on type
//     switch (type) {
//         case 'success':
//             notification.style.backgroundColor = '#34a853';
//             break;
//         case 'error':
//             notification.style.backgroundColor = '#ea4335';
//             break;
//         default:
//             notification.style.backgroundColor = '#4285f4';
//     }

//     // Add to page
//     document.body.appendChild(notification);

//     // Animate in
//     setTimeout(() => {
//         notification.style.transform = 'translateX(0)';
//     }, 100);

//     // Remove after delay
//     setTimeout(() => {
//         notification.style.transform = 'translateX(100%)';
//         setTimeout(() => {
//             if (notification.parentNode) {
//                 notification.parentNode.removeChild(notification);
//             }
//         }, 300);
//     }, 3000);
// }

// // Listen for storage changes to update UI
// chrome.storage.onChanged.addListener((changes, namespace) => {
//     if (namespace === 'local') {
//         if (changes.userEmail || changes.userId) {
//             // Refresh auth section when user data changes
//             getUserData().then(async userData => {
//                 await updateAuthSection(userData);
//                 // Re-setup event listeners for the new buttons
//                 setupEventListeners();
//             });
//         }

//         if (changes.isPaidVersion) {
//             // Update version status when payment status changes
//             updateVersionStatus(changes.isPaidVersion.newValue || false);
//             //updateBuyProButton(changes.isPaidVersion.newValue || false);
//         }
//     }
// });

// // Listen for messages from background script
// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//     if (message.action === 'authenticationComplete') {
//         // Refresh the page when authentication completes
//         const userData = await getUserData();
//         await updateAuthSection(userData);

//         // Re-setup event listeners for the new buttons
//         setupEventListeners();

//         // Check payment status for the newly signed-in user
//         if (userData.userEmail && userData.userId) {
//             //await checkPaymentStatus(userData);
//         }

//         showSuccess('Authentication completed successfully!');

//         // Reset sign-in button if it exists
//         const signInBtn = $('#sign-in-btn');
//         if (signInBtn) {
//             signInBtn.disabled = false;
//             signInBtn.innerHTML = '🔐 Sign in with Google';
//         }
//     }
// });

// function notifyContentScript() {
//     // Notify all tabs about payment status update
//     chrome.tabs.query({}, (tabs) => {
//         tabs.forEach(tab => {
//             if (tab.url && tab.url.includes('photos.google.com')) {
//                 chrome.tabs.sendMessage(tab.id, {
//                     action: 'paymentStatusUpdated'
//                 }).catch(() => {
//                     // Ignore errors for tabs without content script
//                 });
//             }
//         });
//     });
// } 

// var extensionPageObj = {
//     addEvents: function (params) {
//         $(document).on("click", '#sign-out-btn', function (event) {
//             handleSignOut()
//         });

//         $(document).on("click", '#open-photos-btn', function (event) {
//             handleOpenPhotos();
//         });
//     }
// }

// $(document).ready(function () {
//     extensionPageObj.addEvents();
// })



// extension-page.js 


//  After Update: 

 // Initialize Firebase

const firebaseConfig = {
  apiKey: "AIzaSyCC6SilBsdYgtJVL2LGLiewhJXMaNqMrWI",
  authDomain: "dupeyaktest.firebaseapp.com",
  projectId: "dupeyaktest",
  storageBucket: "dupeyaktest.firebasestorage.app",
  messagingSenderId: "820990403204",
  appId: "1:820990403204:web:2a850c95d9d1e3848ed8d1",
  measurementId: "G-9R53SDE1HY"
};


const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const setDoc = firebase.firestore();
const doc = firebase.firestore();


async function storeUserInFirestore(userInfo) {
     return db.collection("users").doc(userInfo.id).set({
    name: userInfo.name,
    email: userInfo.email,
    picture: userInfo.picture,
    loggedInAt: new Date(),
  });
}


async function handleAuthSuccess(userInfo) {
        try {
            await new Promise((resolve) => {
                chrome.storage.local.set({
                    userEmail: userInfo.email,
                    userId: userInfo.id,
                    authTimestamp: Date.now()
                }, resolve);
            });
        } catch (error) {
            console.error('Failed to handle OAuth success:', error);
            throw error;
        }
    }
document.addEventListener('DOMContentLoaded', function () {
    initMainPage();
});

async function initMainPage() {
    try {
        showVersionInfo();
        const userData = await fetchUserData();
        await refreshAuthUI(userData);
        if (userData.userEmail && userData.userId) {
        } else {
            bindEventHandlers();
        }

    } catch (error) {
        console.error('Error initializing page:', error);
        displayError('Failed to initialize extension page');
    }
}

function showVersionInfo() {
    const versionElement = $('#extension-version');
    if (versionElement) {
        const manifest = chrome.runtime.getManifest();
        versionElement.textContent = `v${manifest.version}`;
    }
}

function setAppTitle() {
    const titleElement = $('#app-title');
    if (titleElement) {
            titleElement.textContent = 'DupeYak Duplicate Remover';
    }
}

function setVersionStatus() {
    setAppTitle();
    showVersionInfo();

}
async function fetchUserData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userEmail', 'userId'], (result) => {
            resolve(result);
        });
    });
}

async function refreshAuthUI(userInfo) {
    const accountSection = document.querySelector('.account-section');

    if (userInfo.userEmail && userInfo.userId) {
        accountSection.innerHTML = buildSignedInView(userInfo.userEmail);
        setAppTitle();
    } else {
        accountSection.innerHTML = buildSignInView();
        setAppTitle(false);
    }
}

function buildSignedInView(email) {
    const buttons = [
        `<button class="btn btn-secondary" id="open-photos-btn">
            📸 Open Google Photos
        </button>`
    ];
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

function buildSignInView() {
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

function bindEventHandlers() {
    document.getElementById("sign-in-btn").addEventListener("click", async () => {
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
                        handleAuthSuccess(userInfo);
                        
                        storeUserInFirestore(userInfo)
                            .then(() => {
                            })
                            .catch(console.error);

                    });
            }
        );


    });

    const signOutBtn = $('#sign-out-btn');
    if (signOutBtn.length) {
        signOutBtn.on('click', onUserSignOut);
    }

    const openPhotosBtn = $('#open-photos-btn');
    if (openPhotosBtn.length) {
        openPhotosBtn.on('click', onOpenPhotos);
    }
}



async function onUserSignIn() {
    const signInBtn = $('#sign-in-btn');
    if (signInBtn) {
        signInBtn.disabled = true;
        signInBtn.innerHTML = '<div class="spinner"></div> Opening Google OAuth...';
    }

    try {
        const result = await chrome.runtime.sendMessage({
            action: 'authenticate'
        });

        if (result.success) {
            if (signInBtn) {
                signInBtn.innerHTML = '<div class="spinner"></div> Complete sign-in in the opened tab...';
            }
            displaySuccess('Authentication tab opened! Please complete sign-in in the new tab.');
        } else {
            throw new Error(result.error || 'Authentication failed');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        displayError('Failed to start authentication. Please try again.');
        if (signInBtn) {
            signInBtn.disabled = false;
            signInBtn.innerHTML = '🔐 Sign in with Google';
        }
    }
}

async function onUserSignOut() {
    const signOutBtn = $('#sign-out-btn');
    if (signOutBtn) {
        signOutBtn.disabled = true;
        signOutBtn.innerHTML = '<div class="spinner"></div> Signing out...';
    }

    try {
        await new Promise((resolve) => {
            chrome.storage.local.remove([
                'userEmail',
                'userId',
                'isPaidVersion',
                'lastPaidStatusCheck',
                'paymentData'
            ], resolve);
        });
        await refreshAuthUI({});
        bindEventHandlers();
        setAppTitle(false);
        // notifyContentScript();

        displaySuccess('Successfully signed out!');
    } catch (error) {
        console.error('Sign out error:', error);
        displayError('Failed to sign out. Please try again.');
    } finally {
        const signOutBtn = $('#sign-out-btn');
        if (signOutBtn) {
            signOutBtn.disabled = false;
            signOutBtn.innerHTML = '🚪 Sign Out';
        }
    }
}

function onOpenPhotos() {
    chrome.tabs.create({ url: 'https://photos.google.com' });
}
function displaySuccess(message) {
    displayNotification(message, 'success');
}

function displayError(message) {
    displayNotification(message, 'error');
}

function displayNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

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
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.userEmail || changes.userId) {
            fetchUserData().then(async userData => {
                await refreshAuthUI(userData);
                bindEventHandlers();
            });
        }
    }
});
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'authenticationComplete') {
        const userData = await fetchUserData();
        await refreshAuthUI(userData);
        bindEventHandlers();
        if (userData.userEmail && userData.userId) {
        }

        displaySuccess('Authentication completed successfully!');

        const signInBtn = $('#sign-in-btn');
        if (signInBtn) {
            signInBtn.disabled = false;
            signInBtn.innerHTML = '🔐 Sign in with Google';
        }
    }
});

// function notifyContentScript() {
//     chrome.tabs.query({}, (tabs) => {
//         tabs.forEach(tab => {
//             if (tab.url && tab.url.includes('photos.google.com')) {
//                 chrome.tabs.sendMessage(tab.id, {
//                     action: 'paymentStatusUpdated'
//                 }).catch(() => {
//                 });
//             }
//         });
//     });
// } 

var extensionPageCore = {
    addEvents: function (params) {
        $(document).on("click", '#sign-out-btn', function (event) {
            onUserSignOut()
        });

        $(document).on("click", '#open-photos-btn', function (event) {
            onOpenPhotos();
        });
    }
}

$(document).ready(function () {
    extensionPageCore.addEvents();
})
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQjtBQUNwQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CO0FBQ3BCLGdCQUFnQjtBQUNoQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUSxTQUFTO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZO0FBQ1osUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZEQUE2RCxLQUFLO0FBQ2xFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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L2pzL2V4dGVuc2lvbi1wYWdlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIC8vIEluaXRpYWxpemUgRmlyZWJhc2VcclxuLy8gLy9jbGllbnQga2FcclxuLy8gY29uc3QgZmlyZWJhc2VDb25maWcgPSB7XHJcbi8vICAgYXBpS2V5OiBcIkFJemFTeUNDNlNpbEJzZFlndEpWTDJMR0xpZXdoSlhNYU5xTXJXSVwiLFxyXG4vLyAgIGF1dGhEb21haW46IFwiZHVwZXlha3Rlc3QuZmlyZWJhc2VhcHAuY29tXCIsXHJcbi8vICAgcHJvamVjdElkOiBcImR1cGV5YWt0ZXN0XCIsXHJcbi8vICAgc3RvcmFnZUJ1Y2tldDogXCJkdXBleWFrdGVzdC5maXJlYmFzZXN0b3JhZ2UuYXBwXCIsXHJcbi8vICAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiODIwOTkwNDAzMjA0XCIsXHJcbi8vICAgYXBwSWQ6IFwiMTo4MjA5OTA0MDMyMDQ6d2ViOjJhODUwYzk1ZDlkMWUzODQ4ZWQ4ZDFcIixcclxuLy8gICBtZWFzdXJlbWVudElkOiBcIkctOVI1M1NERTFIWVwiXHJcbi8vIH07XHJcblxyXG5cclxuLy8gLy8g4pyFIEluaXRpYWxpemUgRmlyZWJhc2VcclxuLy8gY29uc3QgYXBwID0gZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChmaXJlYmFzZUNvbmZpZyk7XHJcbi8vIGNvbnN0IGF1dGggPSBmaXJlYmFzZS5hdXRoKCk7XHJcbi8vIGNvbnN0IGRiID0gZmlyZWJhc2UuZmlyZXN0b3JlKCk7XHJcbi8vIGNvbnN0IHNldERvYyA9IGZpcmViYXNlLmZpcmVzdG9yZSgpO1xyXG4vLyBjb25zdCBkb2MgPSBmaXJlYmFzZS5maXJlc3RvcmUoKTtcclxuXHJcblxyXG4vLyBhc3luYyBmdW5jdGlvbiBzYXZlVXNlclRvRmlyZXN0b3JlKHVzZXJJbmZvKSB7XHJcbi8vICAgICAgcmV0dXJuIGRiLmNvbGxlY3Rpb24oXCJ1c2Vyc1wiKS5kb2ModXNlckluZm8uaWQpLnNldCh7XHJcbi8vICAgICBuYW1lOiB1c2VySW5mby5uYW1lLFxyXG4vLyAgICAgZW1haWw6IHVzZXJJbmZvLmVtYWlsLFxyXG4vLyAgICAgcGljdHVyZTogdXNlckluZm8ucGljdHVyZSxcclxuLy8gICAgIGxvZ2dlZEluQXQ6IG5ldyBEYXRlKCksXHJcbi8vICAgfSk7XHJcbi8vIH1cclxuXHJcblxyXG4vLyBhc3luYyBmdW5jdGlvbiBoYW5kbGVPQXV0aFN1Y2Nlc3ModXNlckluZm8pIHtcclxuLy8gICAgICAgICB0cnkge1xyXG4vLyAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBQcm9jZXNzaW5nIE9BdXRoIHN1Y2Nlc3MuLi4nKTtcclxuLy8gICAgICAgICAgICAgLy8gU3RvcmUgdXNlciBpbmZvIGluIGV4dGVuc2lvbiBzdG9yYWdlXHJcbi8vICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbi8vICAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIHVzZXJFbWFpbDogdXNlckluZm8uZW1haWwsXHJcbi8vICAgICAgICAgICAgICAgICAgICAgdXNlcklkOiB1c2VySW5mby5pZCxcclxuLy8gICAgICAgICAgICAgICAgICAgICBhdXRoVGltZXN0YW1wOiBEYXRlLm5vdygpXHJcbi8vICAgICAgICAgICAgICAgICB9LCByZXNvbHZlKTtcclxuLy8gICAgICAgICAgICAgfSk7XHJcbi8vICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgVXNlciBpbmZvIHN0b3JlZDonLCB1c2VySW5mby5lbWFpbCk7XHJcbi8vICAgICAgICAgICAgIC8vYXdhaXQgdXBkYXRlQXV0aFNlY3Rpb24odXNlckluZm8pO1xyXG4vLyAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbi8vICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gaGFuZGxlIE9BdXRoIHN1Y2Nlc3M6JywgZXJyb3IpO1xyXG4vLyAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuLy8gICAgICAgICB9XHJcbi8vICAgICB9XHJcbi8vIC8vIEV4dGVuc2lvbiBQYWdlIEphdmFTY3JpcHRcclxuLy8gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uICgpIHtcclxuLy8gICAgIGNvbnNvbGUubG9nKCdFeHRlbnNpb24gcGFnZSBsb2FkZWQnKTtcclxuXHJcbi8vICAgICAvLyBJbml0aWFsaXplIHRoZSBwYWdlXHJcbi8vICAgICBpbml0aWFsaXplUGFnZSgpO1xyXG4vLyB9KTtcclxuXHJcbi8vIGFzeW5jIGZ1bmN0aW9uIGluaXRpYWxpemVQYWdlKCkge1xyXG4vLyAgICAgdHJ5IHtcclxuLy8gICAgICAgICAvLyBVcGRhdGUgdmVyc2lvbiBmcm9tIG1hbmlmZXN0XHJcbi8vICAgICAgICAgdXBkYXRlVmVyc2lvbkRpc3BsYXkoKTtcclxuXHJcbi8vICAgICAgICAgLy8gQ2hlY2sgYXV0aGVudGljYXRpb24gc3RhdHVzIGFuZCB1cGRhdGUgVUlcclxuLy8gICAgICAgICBjb25zdCB1c2VyRGF0YSA9IGF3YWl0IGdldFVzZXJEYXRhKCk7XHJcbi8vICAgICAgICAgYXdhaXQgdXBkYXRlQXV0aFNlY3Rpb24odXNlckRhdGEpO1xyXG5cclxuLy8gICAgICAgICAvLyBDaGVjayBwYXltZW50IHN0YXR1cyBpZiB1c2VyIGlzIHNpZ25lZCBpblxyXG4vLyAgICAgICAgIGlmICh1c2VyRGF0YS51c2VyRW1haWwgJiYgdXNlckRhdGEudXNlcklkKSB7XHJcbi8vICAgICAgICAgICAgIC8vYXdhaXQgY2hlY2tQYXltZW50U3RhdHVzKHVzZXJEYXRhKTtcclxuLy8gICAgICAgICB9IGVsc2Uge1xyXG4vLyAgICAgICAgICAgICAvLyBTZXQgdXAgZXZlbnQgbGlzdGVuZXJzIGZvciBzaWduZWQtb3V0IHN0YXRlXHJcbi8vICAgICAgICAgICAgIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuLy8gICAgICAgICB9XHJcblxyXG4vLyAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuLy8gICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbml0aWFsaXppbmcgcGFnZTonLCBlcnJvcik7XHJcbi8vICAgICAgICAgc2hvd0Vycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBleHRlbnNpb24gcGFnZScpO1xyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiB1cGRhdGVWZXJzaW9uRGlzcGxheSgpIHtcclxuLy8gICAgIGNvbnN0IHZlcnNpb25FbGVtZW50ID0gJCgnI2V4dGVuc2lvbi12ZXJzaW9uJyk7XHJcbi8vICAgICBpZiAodmVyc2lvbkVsZW1lbnQpIHtcclxuLy8gICAgICAgICAvLyBHZXQgdmVyc2lvbiBmcm9tIG1hbmlmZXN0XHJcbi8vICAgICAgICAgY29uc3QgbWFuaWZlc3QgPSBjaHJvbWUucnVudGltZS5nZXRNYW5pZmVzdCgpO1xyXG4vLyAgICAgICAgIHZlcnNpb25FbGVtZW50LnRleHRDb250ZW50ID0gYHYke21hbmlmZXN0LnZlcnNpb259YDtcclxuLy8gICAgICAgICBjb25zb2xlLmxvZygn8J+TiyBFeHRlbnNpb24gdmVyc2lvbjonLCBtYW5pZmVzdC52ZXJzaW9uKTtcclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLy8gZnVuY3Rpb24gdXBkYXRlQXBwVGl0bGUoaXNQcm8gPSBmYWxzZSkge1xyXG4vLyAgICAgY29uc3QgdGl0bGVFbGVtZW50ID0gJCgnI2FwcC10aXRsZScpO1xyXG4vLyAgICAgaWYgKHRpdGxlRWxlbWVudCkge1xyXG4vLyAgICAgICAgIGlmIChpc1Bybykge1xyXG4vLyAgICAgICAgICAgICB0aXRsZUVsZW1lbnQuaW5uZXJIVE1MID0gJ0R1cGVZYWsgRHVwbGljYXRlIFJlbW92ZXIgPHNwYW4gY2xhc3M9XCJwcm8tYmFkZ2VcIj5QUk88L3NwYW4+JztcclxuLy8gICAgICAgICB9IGVsc2Uge1xyXG4vLyAgICAgICAgICAgICB0aXRsZUVsZW1lbnQudGV4dENvbnRlbnQgPSAnRHVwZVlhayBEdXBsaWNhdGUgUmVtb3Zlcic7XHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiB1cGRhdGVWZXJzaW9uU3RhdHVzKGlzUHJvID0gZmFsc2UpIHtcclxuLy8gICAgIC8vIFVwZGF0ZSBhcHAgdGl0bGUgd2l0aCBwcm8gc3RhdHVzXHJcbi8vICAgICB1cGRhdGVBcHBUaXRsZShpc1Bybyk7XHJcblxyXG4vLyAgICAgLy8gVXBkYXRlIHZlcnNpb24gZGlzcGxheVxyXG4vLyAgICAgdXBkYXRlVmVyc2lvbkRpc3BsYXkoKTtcclxuXHJcbi8vICAgICAvLyBMb2cgdGhlIHN0YXR1cyBjaGFuZ2VcclxuLy8gICAgIGNvbnNvbGUubG9nKCfwn5OKIFZlcnNpb24gc3RhdHVzIHVwZGF0ZWQ6JywgaXNQcm8gPyAnUFJPJyA6ICdGUkVFJyk7XHJcbi8vIH1cclxuXHJcbi8vIGFzeW5jIGZ1bmN0aW9uIGNoZWNrUGF5bWVudFN0YXR1cyh1c2VyRGF0YSkge1xyXG4vLyAgICAgdHJ5IHtcclxuLy8gICAgICAgICBjb25zb2xlLmxvZygn8J+UjSBDaGVja2luZyBwYXltZW50IHN0YXR1cyBmb3IgdXNlcjonLCB1c2VyRGF0YS51c2VyRW1haWwpO1xyXG5cclxuLy8gICAgICAgICAvLyBHZW5lcmF0ZSBhdXRoIGhhc2ggZm9yIHZlcmlmaWNhdGlvblxyXG4vLyAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuLy8gICAgICAgICAgICAgYWN0aW9uOiAnZ2VuZXJhdGVBdXRoSGFzaCcsXHJcbi8vICAgICAgICAgICAgIGFjY291bnRJZDogdXNlckRhdGEudXNlcklkLFxyXG4vLyAgICAgICAgICAgICBleHRlbnNpb25JZDogY2hyb21lLnJ1bnRpbWUuaWRcclxuLy8gICAgICAgICB9KTtcclxuXHJcbi8vICAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xyXG4vLyAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBhdXRoIGhhc2gnKTtcclxuLy8gICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgIC8vIENoZWNrIHBheW1lbnQgc3RhdHVzIHdpdGggc2VydmVyXHJcbi8vICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGkuZ3Bkcm0uY29tL2NoZWNrLXBheW1lbnQtc3RhdHVzJywge1xyXG4vLyAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuLy8gICAgICAgICAgICAgaGVhZGVyczoge1xyXG4vLyAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuLy8gICAgICAgICAgICAgfSxcclxuLy8gICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4vLyAgICAgICAgICAgICAgICAgYWNjb3VudElkOiB1c2VyRGF0YS51c2VySWQsXHJcbi8vICAgICAgICAgICAgICAgICBlbWFpbDogdXNlckRhdGEudXNlckVtYWlsLFxyXG4vLyAgICAgICAgICAgICAgICAgYXV0aEhhc2g6IHJlc3VsdC5hdXRoSGFzaCxcclxuLy8gICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4vLyAgICAgICAgICAgICB9KVxyXG4vLyAgICAgICAgIH0pO1xyXG5cclxuLy8gICAgICAgICBpZiAocmVzcG9uc2Uub2spIHtcclxuLy8gICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuLy8gICAgICAgICAgICAgLy8gY29uc3QgaXNQYWlkID0gZGF0YS5pc1BhaWQgfHwgZmFsc2U7XHJcbi8vICAgICAgICAgICAgICBjb25zdCBpc1BhaWQgPSB0cnVlO1xyXG5cclxuXHJcbi8vICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgUGF5bWVudCBzdGF0dXMgY2hlY2sgY29tcGxldGU6JywgaXNQYWlkID8gJ1BBSUQnIDogJ0ZSRUUnKTtcclxuXHJcbi8vICAgICAgICAgICAgIC8vIFVwZGF0ZSBsb2NhbCBzdG9yYWdlXHJcbi8vICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbi8vICAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIGlzUGFpZFZlcnNpb246IGlzUGFpZCxcclxuLy8gICAgICAgICAgICAgICAgICAgICBsYXN0UGFpZFN0YXR1c0NoZWNrOiBEYXRlLm5vdygpLFxyXG4vLyAgICAgICAgICAgICAgICAgICAgIHBheW1lbnREYXRhOiBkYXRhLnBheW1lbnREYXRhIHx8IG51bGxcclxuLy8gICAgICAgICAgICAgICAgIH0sIHJlc29sdmUpO1xyXG4vLyAgICAgICAgICAgICB9KTtcclxuXHJcbi8vICAgICAgICAgICAgIC8vIFVwZGF0ZSBhcHAgdGl0bGUgd2l0aCBwcm8gYmFkZ2VcclxuLy8gICAgICAgICAgICAgdXBkYXRlQXBwVGl0bGUoaXNQYWlkKTtcclxuXHJcbi8vICAgICAgICAgICAgIC8vIFVwZGF0ZSBCdXkgUHJvIGJ1dHRvbiB2aXNpYmlsaXR5XHJcbi8vICAgICAgICAgICAgIC8vdXBkYXRlQnV5UHJvQnV0dG9uKGlzUGFpZCk7XHJcblxyXG4vLyAgICAgICAgICAgICAvLyBSZWZyZXNoIHRoZSBhdXRoIHNlY3Rpb24gd2l0aCB1cGRhdGVkIHBheW1lbnQgc3RhdHVzXHJcbi8vICAgICAgICAgICAgIGF3YWl0IHVwZGF0ZUF1dGhTZWN0aW9uKHVzZXJEYXRhKTtcclxuXHJcbi8vICAgICAgICAgICAgIC8vIFJlLXNldHVwIGV2ZW50IGxpc3RlbmVycyBzaW5jZSB3ZSByZWNyZWF0ZWQgdGhlIGJ1dHRvbnNcclxuLy8gICAgICAgICAgICAgc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG5cclxuLy8gICAgICAgICAgICAgLy8gTm90aWZ5IGNvbnRlbnQgc2NyaXB0IG9mIHN0YXR1cyB1cGRhdGVcclxuLy8gICAgICAgICAgICAgbm90aWZ5Q29udGVudFNjcmlwdCgpO1xyXG5cclxuLy8gICAgICAgICB9IGVsc2Uge1xyXG4vLyAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ+KaoO+4jyBQYXltZW50IHN0YXR1cyBjaGVjayBmYWlsZWQ6JywgcmVzcG9uc2Uuc3RhdHVzKTtcclxuLy8gICAgICAgICAgICAgLy8gRmFsbCBiYWNrIHRvIGxvY2FsIHN0b3JhZ2VcclxuLy8gICAgICAgICAgICAgY29uc3QgbG9jYWxEYXRhID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuLy8gICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ2lzUGFpZFZlcnNpb24nXSwgcmVzb2x2ZSk7XHJcbi8vICAgICAgICAgICAgIH0pO1xyXG4vLyAgICAgICAgICAgICB1cGRhdGVBcHBUaXRsZShsb2NhbERhdGEuaXNQYWlkVmVyc2lvbiB8fCBmYWxzZSk7XHJcbi8vICAgICAgICAgfVxyXG5cclxuLy8gICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbi8vICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEVycm9yIGNoZWNraW5nIHBheW1lbnQgc3RhdHVzOicsIGVycm9yKTtcclxuLy8gICAgICAgICAvLyBGYWxsIGJhY2sgdG8gbG9jYWwgc3RvcmFnZVxyXG4vLyAgICAgICAgIGNvbnN0IGxvY2FsRGF0YSA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbi8vICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ2lzUGFpZFZlcnNpb24nXSwgcmVzb2x2ZSk7XHJcbi8vICAgICAgICAgfSk7XHJcbi8vICAgICAgICAgdXBkYXRlQXBwVGl0bGUobG9jYWxEYXRhLmlzUGFpZFZlcnNpb24gfHwgZmFsc2UpO1xyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG5cclxuXHJcbi8vIC8vIGZ1bmN0aW9uIHVwZGF0ZUJ1eVByb0J1dHRvbihpc1BhaWQpIHtcclxuLy8gLy8gICAgIGNvbnN0IGJ1eVByb0J0biA9ICQoJyNidXktcHJvLWJ0bicpO1xyXG4vLyAvLyAgICAgaWYgKGJ1eVByb0J0bikge1xyXG4vLyAvLyAgICAgICAgIGlmIChpc1BhaWQpIHtcclxuLy8gLy8gICAgICAgICAgICAgYnV5UHJvQnRuLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbi8vIC8vICAgICAgICAgfSBlbHNlIHtcclxuLy8gLy8gICAgICAgICAgICAgYnV5UHJvQnRuLnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lLWZsZXgnO1xyXG4vLyAvLyAgICAgICAgIH1cclxuLy8gLy8gICAgIH1cclxuLy8gLy8gfVxyXG5cclxuLy8gYXN5bmMgZnVuY3Rpb24gZ2V0VXNlckRhdGEoKSB7XHJcbi8vICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuLy8gICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoWyd1c2VyRW1haWwnLCAndXNlcklkJ10sIChyZXN1bHQpID0+IHtcclxuLy8gICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4vLyAgICAgICAgIH0pO1xyXG4vLyAgICAgfSk7XHJcbi8vIH1cclxuXHJcbi8vIGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUF1dGhTZWN0aW9uKHVzZXJJbmZvKSB7XHJcbi8vICAgICBjb25zdCBhY2NvdW50U2VjdGlvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hY2NvdW50LXNlY3Rpb24nKTtcclxuXHJcbi8vICAgICBpZiAodXNlckluZm8udXNlckVtYWlsICYmIHVzZXJJbmZvLnVzZXJJZCkge1xyXG4vLyAgICAgICAgIC8vIFVzZXIgaXMgc2lnbmVkIGluIC0gZ2V0IFBybyBzdGF0dXMgZnJvbSBzdG9yYWdlXHJcbi8vICAgICAgICAgY29uc3Qgc3RvcmFnZURhdGEgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4vLyAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoWydpc1BhaWRWZXJzaW9uJ10sIHJlc29sdmUpO1xyXG4vLyAgICAgICAgIH0pO1xyXG4vLyAgICAgICAgIGNvbnN0IGlzUHJvID0gc3RvcmFnZURhdGEuaXNQYWlkVmVyc2lvbiB8fCBmYWxzZTtcclxuXHJcbi8vICAgICAgICAgYWNjb3VudFNlY3Rpb24uaW5uZXJIVE1MID0gY3JlYXRlU2lnbmVkSW5IVE1MKHVzZXJJbmZvLnVzZXJFbWFpbCwgaXNQcm8pO1xyXG5cclxuLy8gICAgICAgICAvLyBVcGRhdGUgYXBwIHRpdGxlIHdpdGggcHJvIHN0YXR1c1xyXG4vLyAgICAgICAgIHVwZGF0ZUFwcFRpdGxlKGlzUHJvKTtcclxuLy8gICAgIH0gZWxzZSB7XHJcbi8vICAgICAgICAgLy8gVXNlciBpcyBub3Qgc2lnbmVkIGluXHJcbi8vICAgICAgICAgYWNjb3VudFNlY3Rpb24uaW5uZXJIVE1MID0gY3JlYXRlU2lnbkluSFRNTCgpO1xyXG5cclxuLy8gICAgICAgICAvLyBTZXQgYXBwIHRpdGxlIHRvIGZyZWUgd2hlbiBub3Qgc2lnbmVkIGluXHJcbi8vICAgICAgICAgdXBkYXRlQXBwVGl0bGUoZmFsc2UpO1xyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiBjcmVhdGVTaWduZWRJbkhUTUwoZW1haWwsIGlzUHJvID0gZmFsc2UpIHtcclxuLy8gICAgIC8vIEJ1aWxkIHRoZSBidXR0b25zIGFycmF5IGNvbmRpdGlvbmFsbHlcclxuLy8gICAgIGNvbnN0IGJ1dHRvbnMgPSBbXHJcbi8vICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGlkPVwib3Blbi1waG90b3MtYnRuXCI+XHJcbi8vICAgICAgICAgICAgIPCfk7ggT3BlbiBHb29nbGUgUGhvdG9zXHJcbi8vICAgICAgICAgPC9idXR0b24+YFxyXG4vLyAgICAgXTtcclxuXHJcbi8vICAgICAvLyBBZGQgUHJvLW9ubHkgYnV0dG9ucyBpZiB1c2VyIGhhcyBQcm9cclxuLy8gICAgIGlmIChpc1Bybykge1xyXG4vLyAgICAgICAgIGJ1dHRvbnMucHVzaChgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgaWQ9XCJkb3dubG9hZC1yZWNlaXB0LWJ0blwiPlxyXG4vLyAgICAgICAgICAgICDwn5OEIERvd25sb2FkIFJlY2VpcHRcclxuLy8gICAgICAgICA8L2J1dHRvbj5gKTtcclxuXHJcbi8vICAgICAgICAgYnV0dG9ucy5wdXNoKGA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBpZD1cInN1cHBvcnQtYnRuXCI+XHJcbi8vICAgICAgICAgICAgIPCfkqwgQ29udGFjdCBTdXBwb3J0XHJcbi8vICAgICAgICAgPC9idXR0b24+YCk7XHJcbi8vICAgICB9XHJcblxyXG4vLyAgICAgLy8gQWRkIEJ1eSBQcm8gYnV0dG9uIGlmIHVzZXIgZG9lc24ndCBoYXZlIFByb1xyXG4vLyAgICAgLy8gaWYgKCFpc1Bybykge1xyXG4vLyAgICAgLy8gICAgIGJ1dHRvbnMucHVzaChgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tcHJpbWFyeVwiIGlkPVwiYnV5LXByby1idG5cIj5cclxuLy8gICAgIC8vICAgICAgICAg8J+SjiBCdXkgUHJvXHJcbi8vICAgICAvLyAgICAgPC9idXR0b24+YCk7XHJcbi8vICAgICAvLyB9XHJcblxyXG4vLyAgICAgLy8gQWx3YXlzIGFkZCBTaWduIE91dCBidXR0b25cclxuLy8gICAgIGJ1dHRvbnMucHVzaChgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tZGFuZ2VyXCIgaWQ9XCJzaWduLW91dC1idG5cIj5cclxuLy8gICAgICAgICDwn5qqIFNpZ24gT3V0XHJcbi8vICAgICA8L2J1dHRvbj5gKTtcclxuXHJcbi8vICAgICByZXR1cm4gYFxyXG4vLyAgICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWluZm9cIj5cclxuLy8gICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtZGV0YWlsc1wiPlxyXG4vLyAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtbGFiZWxcIj5TaWduZWQgaW4gYXM6PC9kaXY+XHJcbi8vICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1lbWFpbFwiPiR7ZW1haWx9PC9kaXY+XHJcbi8vICAgICAgICAgICAgIDwvZGl2PlxyXG4vLyAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1hY3Rpb25zXCI+XHJcbi8vICAgICAgICAgICAgICAgICAke2J1dHRvbnMuam9pbignXFxuICAgICAgICAgICAgICAgICcpfVxyXG4vLyAgICAgICAgICAgICA8L2Rpdj5cclxuLy8gICAgICAgICA8L2Rpdj5cclxuLy8gICAgIGA7XHJcbi8vIH1cclxuXHJcbi8vIGZ1bmN0aW9uIGNyZWF0ZVNpZ25JbkhUTUwoKSB7XHJcbi8vICAgICByZXR1cm4gYFxyXG4vLyAgICAgICAgIDxkaXYgY2xhc3M9XCJzaWduaW4tY29udGFpbmVyXCI+XHJcbi8vICAgICAgICAgICAgIDxoMiBjbGFzcz1cInNpZ25pbi10aXRsZVwiPldlbGNvbWUgdG8gRHVwZVlhayBEdXBsaWNhdGUgUmVtb3ZlcjwvaDI+XHJcbi8vICAgICAgICAgICAgIDxwIGNsYXNzPVwic2lnbmluLXN1YnRpdGxlXCI+U2lnbiBpbiB3aXRoIHlvdXIgR29vZ2xlIGFjY291bnQgdG8gZ2V0IHN0YXJ0ZWQsIGJ1eSBQUk8gb3IgcmVzdG9yZSB5b3VyIGxpY2Vuc2U8L3A+XHJcbi8vICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXByaW1hcnlcIiBpZD1cInNpZ24taW4tYnRuXCI+XHJcbi8vICAgICAgICAgICAgICAgICDwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGVcclxuLy8gICAgICAgICAgICAgPC9idXR0b24+XHJcbi8vICAgICAgICAgPC9kaXY+XHJcbi8vICAgICBgO1xyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiBzZXR1cEV2ZW50TGlzdGVuZXJzKCkge1xyXG4vLyAgICAgLy8gU2lnbiBpbiBidXR0b25cclxuLy8gICAgIC8vIGNvbnN0IHNpZ25JbkJ0biA9ICQoJyNzaWduLWluLWJ0bicpO1xyXG4vLyAgICAgLy8gaWYgKHNpZ25JbkJ0bi5sZW5ndGgpIHtcclxuLy8gICAgIC8vICAgICBzaWduSW5CdG4ub24oJ2NsaWNrJywgaGFuZGxlU2lnbkluKTtcclxuLy8gICAgIC8vIH1cclxuXHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNpZ24taW4tYnRuXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgXHJcbi8vICAgICAgICAgLy9oYW5kbGVTaWduSW4oKVxyXG4vLyAgICAgICAgIGNocm9tZS5pZGVudGl0eS5sYXVuY2hXZWJBdXRoRmxvdyhcclxuLy8gICAgICAgICAgICAge1xyXG4vLyAgICAgICAgICAgICAgICAgdXJsOiBgaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGg/Y2xpZW50X2lkPTkwNDA5MzgwMDIyNi1nZHNiMTdsNDBtMGNsanN0ZW5yN211dmlpZ3M1cWE5ay5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSZyZXNwb25zZV90eXBlPXRva2VuJnJlZGlyZWN0X3VyaT0ke2VuY29kZVVSSUNvbXBvbmVudChjaHJvbWUuaWRlbnRpdHkuZ2V0UmVkaXJlY3RVUkwoJ3Byb3ZpZGVyX2NiJykpfSZzY29wZT1wcm9maWxlIGVtYWlsYCxcclxuLy8gICAgICAgICAgICAgICAgIGludGVyYWN0aXZlOiB0cnVlXHJcbi8vICAgICAgICAgICAgIH0sXHJcbi8vICAgICAgICAgICAgIGZ1bmN0aW9uIChyZWRpcmVjdFVybCkge1xyXG4vLyAgICAgICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJMb2dpbiBmYWlsZWQ6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XHJcbi8vICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4vLyAgICAgICAgICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobmV3IFVSTChyZWRpcmVjdFVybCkuaGFzaC5zdWJzdHJpbmcoMSkpO1xyXG4vLyAgICAgICAgICAgICAgICAgY29uc3QgYWNjZXNzVG9rZW4gPSBwYXJhbXMuZ2V0KFwiYWNjZXNzX3Rva2VuXCIpO1xyXG5cclxuLy8gICAgICAgICAgICAgICAgIC8vIENhbGwgR29vZ2xlIFVzZXIgSW5mbyBBUElcclxuLy8gICAgICAgICAgICAgICAgIGZldGNoKFwiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YyL3VzZXJpbmZvXCIsIHtcclxuLy8gICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XHJcbi8vICAgICAgICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHthY2Nlc3NUb2tlbn1gLFxyXG4vLyAgICAgICAgICAgICAgICAgICAgIH0sXHJcbi8vICAgICAgICAgICAgICAgICB9KVxyXG4vLyAgICAgICAgICAgICAgICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG4vLyAgICAgICAgICAgICAgICAgICAgIC50aGVuKGFzeW5jIHVzZXJJbmZvID0+IHtcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJVc2VyIGluZm86XCIsIHVzZXJJbmZvKTtcclxuXHJcbi8vICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlbmQgdG8gRmlyZWJhc2UgQVBJIG9yIEZpcmVzdG9yZSBlbnRyeVxyXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVPQXV0aFN1Y2Nlc3ModXNlckluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVVzZXJUb0ZpcmVzdG9yZSh1c2VySW5mbylcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVzZXIgc2F2ZWRcIilcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NoZWNrTG9naW5Gcm9tQ2xpZW50KHVzZXJJbmZvLmlkKTtcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2hhbmRsZU9BdXRoU3VjY2Vzcyh1c2VySW5mbyk7XHJcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG5cclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXdhaXQgc2V0RG9jKGRvYyhkYiwgXCJ1c2Vyc1wiLCB1c2VySW5mby5pZCksIHtcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIG5hbWU6IHVzZXJJbmZvLm5hbWUsXHJcbi8vICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBlbWFpbDogdXNlckluZm8uZW1haWwsXHJcbi8vICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBwaWN0dXJlOiB1c2VySW5mby5waWN0dXJlLFxyXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgbG9nZ2VkSW5BdDogbmV3IERhdGUoKSxcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSk7XHJcblxyXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPUjogU2VuZCB0byB5b3VyIG93biBiYWNrZW5kIGVuZHBvaW50XHJcblxyXG4vLyAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4vLyAgICAgICAgICAgICB9XHJcbi8vICAgICAgICAgKTtcclxuXHJcblxyXG4vLyAgICAgfSk7XHJcblxyXG5cclxuICAgIFxyXG4vLyAgICAgLy8gU2lnbiBPdXQgYnV0dG9uXHJcbi8vICAgICBjb25zdCBzaWduT3V0QnRuID0gJCgnI3NpZ24tb3V0LWJ0bicpO1xyXG4vLyAgICAgaWYgKHNpZ25PdXRCdG4ubGVuZ3RoKSB7XHJcbi8vICAgICAgICAgc2lnbk91dEJ0bi5vbignY2xpY2snLCBoYW5kbGVTaWduT3V0KTtcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICAvLyBPcGVuIFBob3RvcyBidXR0b25cclxuLy8gICAgIGNvbnN0IG9wZW5QaG90b3NCdG4gPSAkKCcjb3Blbi1waG90b3MtYnRuJyk7XHJcbi8vICAgICBpZiAob3BlblBob3Rvc0J0bi5sZW5ndGgpIHtcclxuLy8gICAgICAgICBvcGVuUGhvdG9zQnRuLm9uKCdjbGljaycsIGhhbmRsZU9wZW5QaG90b3MpO1xyXG4vLyAgICAgfVxyXG5cclxuLy8gICAgIC8vIERvd25sb2FkIFJlY2VpcHQgYnV0dG9uXHJcbi8vICAgICBjb25zdCBkb3dubG9hZFJlY2VpcHRCdG4gPSAkKCcjZG93bmxvYWQtcmVjZWlwdC1idG4nKTtcclxuLy8gICAgIGlmIChkb3dubG9hZFJlY2VpcHRCdG4ubGVuZ3RoKSB7XHJcbi8vICAgICAgICAgZG93bmxvYWRSZWNlaXB0QnRuLm9uKCdjbGljaycsIGhhbmRsZURvd25sb2FkUmVjZWlwdCk7XHJcbi8vICAgICB9XHJcblxyXG4vLyAgICAgLy8gU3VwcG9ydCBidXR0b25cclxuLy8gICAgIGNvbnN0IHN1cHBvcnRCdG4gPSAkKCcjc3VwcG9ydC1idG4nKTtcclxuLy8gICAgIGlmIChzdXBwb3J0QnRuLmxlbmd0aCkge1xyXG4vLyAgICAgICAgIHN1cHBvcnRCdG4ub24oJ2NsaWNrJywgaGFuZGxlU3VwcG9ydCk7XHJcbi8vICAgICB9XHJcblxyXG4vLyAgICAgLy8gQnV5IFBybyBidXR0b25cclxuLy8gICAgIGNvbnN0IGJ1eVByb0J0biA9ICQoJyNidXktcHJvLWJ0bicpO1xyXG4vLyAgICAgaWYgKGJ1eVByb0J0bi5sZW5ndGgpIHtcclxuLy8gICAgICAgICBidXlQcm9CdG4ub24oJ2NsaWNrJywgaGFuZGxlQnV5UHJvKTtcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICAvLyBGb290ZXIgbGlua3NcclxuLy8gICAgIC8vc2V0dXBGb290ZXJMaW5rcygpO1xyXG4vLyB9XHJcblxyXG5cclxuXHJcbi8vIGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVNpZ25JbigpIHtcclxuLy8gICAgIGNvbnN0IHNpZ25JbkJ0biA9ICQoJyNzaWduLWluLWJ0bicpO1xyXG4vLyAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4vLyAgICAgICAgIHNpZ25JbkJ0bi5kaXNhYmxlZCA9IHRydWU7XHJcbi8vICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjwvZGl2PiBPcGVuaW5nIEdvb2dsZSBPQXV0aC4uLic7XHJcbi8vICAgICB9XHJcblxyXG4vLyAgICAgdHJ5IHtcclxuLy8gICAgICAgICAvLyBVc2UgdGhlIG5ldyBwb2xsaW5nLWJhc2VkIE9BdXRoIGZsb3dcclxuLy8gICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbi8vICAgICAgICAgICAgIGFjdGlvbjogJ2F1dGhlbnRpY2F0ZSdcclxuLy8gICAgICAgICB9KTtcclxuXHJcbi8vICAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XHJcbi8vICAgICAgICAgICAgIC8vIFVwZGF0ZSBidXR0b24gdG8gc2hvdyBwb2xsaW5nIHN0YXR1c1xyXG4vLyAgICAgICAgICAgICBpZiAoc2lnbkluQnRuKSB7XHJcbi8vICAgICAgICAgICAgICAgICBzaWduSW5CdG4uaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+IENvbXBsZXRlIHNpZ24taW4gaW4gdGhlIG9wZW5lZCB0YWIuLi4nO1xyXG4vLyAgICAgICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgICAgICAvLyBUaGUgT0F1dGggaGVscGVyIHdpbGwgaGFuZGxlIHBvbGxpbmcgYW5kIHVwZGF0ZSBzdG9yYWdlXHJcbi8vICAgICAgICAgICAgIC8vIFdlJ2xsIGdldCBub3RpZmllZCB2aWEgdGhlIGF1dGhlbnRpY2F0aW9uQ29tcGxldGUgbWVzc2FnZVxyXG4vLyAgICAgICAgICAgICBzaG93U3VjY2VzcygnQXV0aGVudGljYXRpb24gdGFiIG9wZW5lZCEgUGxlYXNlIGNvbXBsZXRlIHNpZ24taW4gaW4gdGhlIG5ldyB0YWIuJyk7XHJcbi8vICAgICAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCAnQXV0aGVudGljYXRpb24gZmFpbGVkJyk7XHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuLy8gICAgICAgICBjb25zb2xlLmVycm9yKCdTaWduIGluIGVycm9yOicsIGVycm9yKTtcclxuLy8gICAgICAgICBzaG93RXJyb3IoJ0ZhaWxlZCB0byBzdGFydCBhdXRoZW50aWNhdGlvbi4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuXHJcbi8vICAgICAgICAgLy8gUmVzZXQgYnV0dG9uXHJcbi8vICAgICAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4vLyAgICAgICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuLy8gICAgICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICfwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGUnO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLy8gYXN5bmMgZnVuY3Rpb24gaGFuZGxlU2lnbk91dCgpIHtcclxuLy8gICAgIGNvbnN0IHNpZ25PdXRCdG4gPSAkKCcjc2lnbi1vdXQtYnRuJyk7XHJcbi8vICAgICBpZiAoc2lnbk91dEJ0bikge1xyXG4vLyAgICAgICAgIHNpZ25PdXRCdG4uZGlzYWJsZWQgPSB0cnVlO1xyXG4vLyAgICAgICAgIHNpZ25PdXRCdG4uaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+IFNpZ25pbmcgb3V0Li4uJztcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICB0cnkge1xyXG4vLyAgICAgICAgIC8vIENsZWFyIHN0b3JlZCB1c2VyIGRhdGEgYW5kIHBheW1lbnQgc3RhdHVzXHJcbi8vICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuLy8gICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKFtcclxuLy8gICAgICAgICAgICAgICAgICd1c2VyRW1haWwnLFxyXG4vLyAgICAgICAgICAgICAgICAgJ3VzZXJJZCcsXHJcbi8vICAgICAgICAgICAgICAgICAnaXNQYWlkVmVyc2lvbicsXHJcbi8vICAgICAgICAgICAgICAgICAnbGFzdFBhaWRTdGF0dXNDaGVjaycsXHJcbi8vICAgICAgICAgICAgICAgICAncGF5bWVudERhdGEnXHJcbi8vICAgICAgICAgICAgIF0sIHJlc29sdmUpO1xyXG4vLyAgICAgICAgIH0pO1xyXG5cclxuLy8gICAgICAgICAvLyBVcGRhdGUgVUkgdG8gc2hvdyBzaWduZWQtb3V0IHN0YXRlXHJcbi8vICAgICAgICAgYXdhaXQgdXBkYXRlQXV0aFNlY3Rpb24oe30pO1xyXG5cclxuLy8gICAgICAgICAvLyBSZS1zZXR1cCBldmVudCBsaXN0ZW5lcnMgZm9yIHRoZSBuZXcgYnV0dG9uc1xyXG4vLyAgICAgICAgIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHJcbi8vICAgICAgICAgLy8gVXBkYXRlIGFwcCB0aXRsZSB0byBmcmVlIHZlcnNpb25cclxuLy8gICAgICAgICB1cGRhdGVBcHBUaXRsZShmYWxzZSk7XHJcblxyXG4vLyAgICAgICAgIC8vIE5vdGlmeSBjb250ZW50IHNjcmlwdCBhYm91dCB0aGUgc3RhdHVzIGNoYW5nZVxyXG4vLyAgICAgICAgIG5vdGlmeUNvbnRlbnRTY3JpcHQoKTtcclxuXHJcbi8vICAgICAgICAgc2hvd1N1Y2Nlc3MoJ1N1Y2Nlc3NmdWxseSBzaWduZWQgb3V0IScpO1xyXG4vLyAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuLy8gICAgICAgICBjb25zb2xlLmVycm9yKCdTaWduIG91dCBlcnJvcjonLCBlcnJvcik7XHJcbi8vICAgICAgICAgc2hvd0Vycm9yKCdGYWlsZWQgdG8gc2lnbiBvdXQuIFBsZWFzZSB0cnkgYWdhaW4uJyk7XHJcbi8vICAgICB9IGZpbmFsbHkge1xyXG4vLyAgICAgICAgIGNvbnN0IHNpZ25PdXRCdG4gPSAkKCcjc2lnbi1vdXQtYnRuJyk7XHJcbi8vICAgICAgICAgaWYgKHNpZ25PdXRCdG4pIHtcclxuLy8gICAgICAgICAgICAgc2lnbk91dEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4vLyAgICAgICAgICAgICBzaWduT3V0QnRuLmlubmVySFRNTCA9ICfwn5qqIFNpZ24gT3V0JztcclxuLy8gICAgICAgICB9XHJcbi8vICAgICB9XHJcbi8vIH1cclxuXHJcbi8vIGZ1bmN0aW9uIGhhbmRsZU9wZW5QaG90b3MoKSB7XHJcbi8vICAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6ICdodHRwczovL3Bob3Rvcy5nb29nbGUuY29tJyB9KTtcclxuLy8gfVxyXG5cclxuLy8gYXN5bmMgZnVuY3Rpb24gaGFuZGxlRG93bmxvYWRSZWNlaXB0KCkge1xyXG4vLyAgICAgY29uc3QgZG93bmxvYWRCdG4gPSAkKCcjZG93bmxvYWQtcmVjZWlwdC1idG4nKTtcclxuLy8gICAgIGlmIChkb3dubG9hZEJ0bikge1xyXG4vLyAgICAgICAgIGRvd25sb2FkQnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuLy8gICAgICAgICBkb3dubG9hZEJ0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gR2V0dGluZyBpbnZvaWNlLi4uJztcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICB0cnkge1xyXG4vLyAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OEIERvd25sb2FkaW5nIGludm9pY2UuLi4nKTtcclxuXHJcbi8vICAgICAgICAgLy8gR2V0IHVzZXIgZGF0YVxyXG4vLyAgICAgICAgIGNvbnN0IHVzZXJEYXRhID0gYXdhaXQgZ2V0VXNlckRhdGEoKTtcclxuLy8gICAgICAgICBpZiAoIXVzZXJEYXRhLnVzZXJFbWFpbCB8fCAhdXNlckRhdGEudXNlcklkKSB7XHJcbi8vICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNpZ24gaW4gZmlyc3QgdG8gZG93bmxvYWQgcmVjZWlwdCcpO1xyXG4vLyAgICAgICAgIH1cclxuXHJcbi8vICAgICAgICAgLy8gR2VuZXJhdGUgYXV0aCBoYXNoXHJcbi8vICAgICAgICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuLy8gICAgICAgICAgICAgYWN0aW9uOiAnZ2VuZXJhdGVBdXRoSGFzaCcsXHJcbi8vICAgICAgICAgICAgIGFjY291bnRJZDogdXNlckRhdGEudXNlcklkLFxyXG4vLyAgICAgICAgICAgICBleHRlbnNpb25JZDogY2hyb21lLnJ1bnRpbWUuaWRcclxuLy8gICAgICAgICB9KTtcclxuXHJcbi8vICAgICAgICAgaWYgKCFhdXRoUmVzdWx0LnN1Y2Nlc3MpIHtcclxuLy8gICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgYXV0aGVudGljYXRpb24nKTtcclxuLy8gICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgIC8vIFJlcXVlc3QgaW52b2ljZSBVUkwgZnJvbSBzZXJ2ZXJcclxuLy8gICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5ncGRybS5jb20vZG93bmxvYWQtaW52b2ljZScsIHtcclxuLy8gICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbi8vICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuLy8gICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbi8vICAgICAgICAgICAgIH0sXHJcbi8vICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuLy8gICAgICAgICAgICAgICAgIGFjY291bnRJZDogdXNlckRhdGEudXNlcklkLFxyXG4vLyAgICAgICAgICAgICAgICAgZW1haWw6IHVzZXJEYXRhLnVzZXJFbWFpbCxcclxuLy8gICAgICAgICAgICAgICAgIGF1dGhIYXNoOiBhdXRoUmVzdWx0LmF1dGhIYXNoLFxyXG4vLyAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uSWQ6IGNocm9tZS5ydW50aW1lLmlkXHJcbi8vICAgICAgICAgICAgIH0pXHJcbi8vICAgICAgICAgfSk7XHJcblxyXG4vLyAgICAgICAgIGlmIChyZXNwb25zZS5vaykge1xyXG4vLyAgICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG5cclxuLy8gICAgICAgICAgICAgaWYgKGRhdGEuaW52b2ljZVVybCkge1xyXG4vLyAgICAgICAgICAgICAgICAgLy8gT3BlbiBTdHJpcGUgaG9zdGVkIGludm9pY2UgaW4gbmV3IHRhYlxyXG4vLyAgICAgICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBkYXRhLmludm9pY2VVcmwgfSk7XHJcbi8vICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIE9wZW5lZCBTdHJpcGUgaG9zdGVkIGludm9pY2U6JywgZGF0YS5pbnZvaWNlVXJsKTtcclxuLy8gICAgICAgICAgICAgICAgIHNob3dTdWNjZXNzKCdJbnZvaWNlIG9wZW5lZCBpbiBuZXcgdGFiIScpO1xyXG4vLyAgICAgICAgICAgICB9IGVsc2Uge1xyXG4vLyAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZvaWNlIFVSTCBub3QgYXZhaWxhYmxlJyk7XHJcbi8vICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICB9IGVsc2Uge1xyXG4vLyAgICAgICAgICAgICBjb25zdCBlcnJvckRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbi8vICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvckRhdGEuZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZXQgaW52b2ljZScpO1xyXG4vLyAgICAgICAgIH1cclxuXHJcbi8vICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4vLyAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Rvd25sb2FkIHJlY2VpcHQgZXJyb3I6JywgZXJyb3IpO1xyXG4vLyAgICAgICAgIHNob3dFcnJvcihlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gZG93bmxvYWQgcmVjZWlwdC4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuLy8gICAgIH0gZmluYWxseSB7XHJcbi8vICAgICAgICAgaWYgKGRvd25sb2FkQnRuKSB7XHJcbi8vICAgICAgICAgICAgIGRvd25sb2FkQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbi8vICAgICAgICAgICAgIGRvd25sb2FkQnRuLmlubmVySFRNTCA9ICfwn5OEIERvd25sb2FkIFJlY2VpcHQnO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLy8gZnVuY3Rpb24gaGFuZGxlU3VwcG9ydCgpIHtcclxuLy8gICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogJ2h0dHBzOi8vdC5tZS9ncGRybV9zdXBwb3J0JyB9KTtcclxuLy8gfVxyXG5cclxuLy8gYXN5bmMgZnVuY3Rpb24gaGFuZGxlQnV5UHJvKCkge1xyXG4vLyAgICAgY29uc3QgYnV5UHJvQnRuID0kKCcjYnV5LXByby1idG4nKTtcclxuLy8gICAgIGlmIChidXlQcm9CdG4pIHtcclxuLy8gICAgICAgICBidXlQcm9CdG4uZGlzYWJsZWQgPSB0cnVlO1xyXG4vLyAgICAgICAgIGJ1eVByb0J0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gT3BlbmluZyBwdXJjaGFzZS4uLic7XHJcbi8vICAgICB9XHJcblxyXG4vLyAgICAgdHJ5IHtcclxuLy8gICAgICAgICAvLyBHZXQgdXNlciBpbmZvIGZvciBwdXJjaGFzZVxyXG4vLyAgICAgICAgIGNvbnN0IHVzZXJEYXRhID0gYXdhaXQgZ2V0VXNlckRhdGEoKTtcclxuLy8gICAgICAgICBpZiAoIXVzZXJEYXRhLnVzZXJFbWFpbCB8fCAhdXNlckRhdGEudXNlcklkKSB7XHJcbi8vICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNpZ24gaW4gZmlyc3QgdG8gcHVyY2hhc2UgUHJvIHZlcnNpb24nKTtcclxuLy8gICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgIC8vIEdlbmVyYXRlIGF1dGggaGFzaCBhbmQgb3BlbiBwdXJjaGFzZSBwYWdlXHJcbi8vICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4vLyAgICAgICAgICAgICBhY3Rpb246ICdnZW5lcmF0ZUF1dGhIYXNoJyxcclxuLy8gICAgICAgICAgICAgYWNjb3VudElkOiB1c2VyRGF0YS51c2VySWQsXHJcbi8vICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4vLyAgICAgICAgIH0pO1xyXG5cclxuLy8gICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuLy8gICAgICAgICAgICAgY29uc3QgcHVyY2hhc2VVcmwgPSBgaHR0cHM6Ly9hcGkuZ3Bkcm0uY29tL3B1cmNoYXNlP2FjY291bnRJZD0ke2VuY29kZVVSSUNvbXBvbmVudCh1c2VyRGF0YS51c2VySWQpfSZlbWFpbD0ke2VuY29kZVVSSUNvbXBvbmVudCh1c2VyRGF0YS51c2VyRW1haWwpfSZhdXRoSGFzaD0ke2VuY29kZVVSSUNvbXBvbmVudChyZXN1bHQuYXV0aEhhc2gpfSZleHRlbnNpb25JZD0ke2VuY29kZVVSSUNvbXBvbmVudChjaHJvbWUucnVudGltZS5pZCl9YDtcclxuXHJcbi8vICAgICAgICAgICAgIC8vIE9wZW4gcHVyY2hhc2UgcGFnZVxyXG4vLyAgICAgICAgICAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6IHB1cmNoYXNlVXJsIH0pO1xyXG5cclxuLy8gICAgICAgICAgICAgLy8gVXBkYXRlIGJ1dHRvbiB0byBzaG93IHBvbGxpbmcgc3RhdHVzXHJcbi8vICAgICAgICAgICAgIGlmIChidXlQcm9CdG4pIHtcclxuLy8gICAgICAgICAgICAgICAgIGJ1eVByb0J0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gQ29tcGxldGUgcHVyY2hhc2UgaW4gdGhlIG9wZW5lZCB0YWIuLi4nO1xyXG4vLyAgICAgICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgICAgICBzaG93U3VjY2VzcygnUHVyY2hhc2UgcGFnZSBvcGVuZWQhIENvbXBsZXRlIHlvdXIgcHVyY2hhc2UgaW4gdGhlIG5ldyB0YWIuJyk7XHJcblxyXG4vLyAgICAgICAgICAgICAvLyBTdGFydCBwb2xsaW5nIGZvciBwYXltZW50IGNvbXBsZXRpb25cclxuLy8gICAgICAgICAgICAgc3RhcnRQdXJjaGFzZVBvbGxpbmcodXNlckRhdGEpO1xyXG4vLyAgICAgICAgIH0gZWxzZSB7XHJcbi8vICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZXN1bHQuZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZW5lcmF0ZSBwdXJjaGFzZSBsaW5rJyk7XHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuLy8gICAgICAgICBjb25zb2xlLmVycm9yKCdCdXkgUHJvIGVycm9yOicsIGVycm9yKTtcclxuLy8gICAgICAgICBzaG93RXJyb3IoZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIG9wZW4gcHVyY2hhc2UgcGFnZS4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuXHJcbi8vICAgICAgICAgLy8gUmVzZXQgYnV0dG9uIG9uIGVycm9yXHJcbi8vICAgICAgICAgaWYgKGJ1eVByb0J0bikge1xyXG4vLyAgICAgICAgICAgICBidXlQcm9CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuLy8gICAgICAgICAgICAgYnV5UHJvQnRuLmlubmVySFRNTCA9ICfwn5KOIEJ1eSBQcm8nO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLy8gYXN5bmMgZnVuY3Rpb24gc3RhcnRQdXJjaGFzZVBvbGxpbmcodXNlckRhdGEpIHtcclxuLy8gICAgIGNvbnNvbGUubG9nKCfwn5SEIFN0YXJ0aW5nIHB1cmNoYXNlIHBvbGxpbmcgZm9yIHVzZXI6JywgdXNlckRhdGEudXNlckVtYWlsKTtcclxuXHJcbi8vICAgICBjb25zdCBtYXhBdHRlbXB0cyA9IDE4MDsgLy8gMyBtaW51dGVzICgxODAgc2Vjb25kcykgd2l0aCAxLXNlY29uZCBpbnRlcnZhbHNcclxuLy8gICAgIGxldCBhdHRlbXB0cyA9IDA7XHJcblxyXG4vLyAgICAgY29uc3QgcG9sbEludGVydmFsID0gc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4vLyAgICAgICAgIGF0dGVtcHRzKys7XHJcbi8vICAgICAgICAgY29uc29sZS5sb2coYPCflI0gUHVyY2hhc2UgcG9sbGluZyBhdHRlbXB0ICR7YXR0ZW1wdHN9LyR7bWF4QXR0ZW1wdHN9YCk7XHJcblxyXG4vLyAgICAgICAgIHRyeSB7XHJcbi8vICAgICAgICAgICAgIC8vIENoZWNrIHBheW1lbnQgc3RhdHVzIHVzaW5nIGV4aXN0aW5nIGVuZHBvaW50XHJcbi8vICAgICAgICAgICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbi8vICAgICAgICAgICAgICAgICBhY3Rpb246ICdnZW5lcmF0ZUF1dGhIYXNoJyxcclxuLy8gICAgICAgICAgICAgICAgIGFjY291bnRJZDogdXNlckRhdGEudXNlcklkLFxyXG4vLyAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uSWQ6IGNocm9tZS5ydW50aW1lLmlkXHJcbi8vICAgICAgICAgICAgIH0pO1xyXG5cclxuLy8gICAgICAgICAgICAgaWYgKCFhdXRoUmVzdWx0LnN1Y2Nlc3MpIHtcclxuLy8gICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIGF1dGggaGFzaCcpO1xyXG4vLyAgICAgICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5ncGRybS5jb20vY2hlY2stcGF5bWVudC1zdGF0dXMnLCB7XHJcbi8vICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuLy8gICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuLy8gICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4vLyAgICAgICAgICAgICAgICAgfSxcclxuLy8gICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuLy8gICAgICAgICAgICAgICAgICAgICBhY2NvdW50SWQ6IHVzZXJEYXRhLnVzZXJJZCxcclxuLy8gICAgICAgICAgICAgICAgICAgICBlbWFpbDogdXNlckRhdGEudXNlckVtYWlsLFxyXG4vLyAgICAgICAgICAgICAgICAgICAgIGF1dGhIYXNoOiBhdXRoUmVzdWx0LmF1dGhIYXNoLFxyXG4vLyAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4vLyAgICAgICAgICAgICAgICAgfSlcclxuLy8gICAgICAgICAgICAgfSk7XHJcblxyXG4vLyAgICAgICAgICAgICBpZiAocmVzcG9uc2Uub2spIHtcclxuLy8gICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcblxyXG4vLyAgICAgICAgICAgICAgICAgaWYgKGRhdGEuaXNQYWlkKSB7XHJcbi8vICAgICAgICAgICAgICAgICAgICAgLy8gUGF5bWVudCBjb21wbGV0ZWQhXHJcbi8vICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChwb2xsSW50ZXJ2YWwpO1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGhhbmRsZVB1cmNoYXNlQ29tcGxldGUoZGF0YSk7XHJcbi8vICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4vLyAgICAgICAgICAgICAgICAgfVxyXG4vLyAgICAgICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgICAgICAvLyBDb250aW51ZSBwb2xsaW5nIGlmIHBheW1lbnQgbm90IGNvbXBsZXRlZCB5ZXRcclxuLy8gICAgICAgICAgICAgaWYgKGF0dGVtcHRzID49IG1heEF0dGVtcHRzKSB7XHJcbi8vICAgICAgICAgICAgICAgICAvLyBUaW1lb3V0IHJlYWNoZWRcclxuLy8gICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwocG9sbEludGVydmFsKTtcclxuLy8gICAgICAgICAgICAgICAgIGhhbmRsZVB1cmNoYXNlVGltZW91dCgpO1xyXG4vLyAgICAgICAgICAgICB9XHJcblxyXG4vLyAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbi8vICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBQdXJjaGFzZSBwb2xsaW5nIGVycm9yOicsIGVycm9yKTtcclxuXHJcbi8vICAgICAgICAgICAgIC8vIENvbnRpbnVlIHBvbGxpbmcgdW5sZXNzIHdlJ3ZlIHJlYWNoZWQgbWF4IGF0dGVtcHRzXHJcbi8vICAgICAgICAgICAgIGlmIChhdHRlbXB0cyA+PSBtYXhBdHRlbXB0cykge1xyXG4vLyAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChwb2xsSW50ZXJ2YWwpO1xyXG4vLyAgICAgICAgICAgICAgICAgaGFuZGxlUHVyY2hhc2VUaW1lb3V0KCk7XHJcbi8vICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICB9XHJcbi8vICAgICB9LCAxMDAwKTsgLy8gUG9sbCBldmVyeSBzZWNvbmRcclxuLy8gfVxyXG5cclxuLy8gYXN5bmMgZnVuY3Rpb24gaGFuZGxlUHVyY2hhc2VDb21wbGV0ZShwYXltZW50RGF0YSkge1xyXG4vLyAgICAgY29uc29sZS5sb2coJ+KchSBQdXJjaGFzZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IScpO1xyXG5cclxuLy8gICAgIC8vIFVwZGF0ZSBsb2NhbCBzdG9yYWdlIHdpdGggcGF5bWVudCBkYXRhXHJcbi8vICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4vLyAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XHJcbi8vICAgICAgICAgICAgIGlzUGFpZFZlcnNpb246IHRydWUsXHJcbi8vICAgICAgICAgICAgIGxhc3RQYWlkU3RhdHVzQ2hlY2s6IERhdGUubm93KCksXHJcbi8vICAgICAgICAgICAgIHBheW1lbnREYXRhOiBwYXltZW50RGF0YS5wYXltZW50RGF0YSB8fCBudWxsXHJcbi8vICAgICAgICAgfSwgcmVzb2x2ZSk7XHJcbi8vICAgICB9KTtcclxuXHJcbi8vICAgICAvLyBVcGRhdGUgVUlcclxuLy8gICAgIHVwZGF0ZVZlcnNpb25TdGF0dXModHJ1ZSk7XHJcbi8vICAgICAvL3VwZGF0ZUJ1eVByb0J1dHRvbih0cnVlKTtcclxuXHJcbi8vICAgICAvLyBSZWZyZXNoIGF1dGggc2VjdGlvbiB0byBzaG93IFBybyBidXR0b25zXHJcbi8vICAgICBjb25zdCB1c2VyRGF0YSA9IGF3YWl0IGdldFVzZXJEYXRhKCk7XHJcbi8vICAgICBhd2FpdCB1cGRhdGVBdXRoU2VjdGlvbih1c2VyRGF0YSk7XHJcblxyXG4vLyAgICAgLy8gUmUtc2V0dXAgZXZlbnQgbGlzdGVuZXJzIGZvciB0aGUgbmV3IGJ1dHRvbnNcclxuLy8gICAgIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHJcbi8vICAgICAvLyBSZXNldCBCdXkgUHJvIGJ1dHRvbiAoaWYgaXQgc3RpbGwgZXhpc3RzKVxyXG4vLyAgICAgY29uc3QgYnV5UHJvQnRuID0gJCgnI2J1eS1wcm8tYnRuJyk7XHJcbi8vICAgICBpZiAoYnV5UHJvQnRuKSB7XHJcbi8vICAgICAgICAgYnV5UHJvQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbi8vICAgICAgICAgYnV5UHJvQnRuLmlubmVySFRNTCA9ICfwn5KOIEJ1eSBQcm8nO1xyXG4vLyAgICAgfVxyXG5cclxuLy8gICAgIC8vIE5vdGlmeSBjb250ZW50IHNjcmlwdFxyXG4vLyAgICAgbm90aWZ5Q29udGVudFNjcmlwdCgpO1xyXG5cclxuLy8gICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlXHJcbi8vICAgICBzaG93U3VjY2Vzcygn8J+OiSBQdXJjaGFzZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5ISBQcm8gZmVhdHVyZXMgYXJlIG5vdyBhY3RpdmUuJyk7XHJcbi8vIH1cclxuXHJcbi8vIGZ1bmN0aW9uIGhhbmRsZVB1cmNoYXNlVGltZW91dCgpIHtcclxuLy8gICAgIGNvbnNvbGUubG9nKCfij7AgUHVyY2hhc2UgcG9sbGluZyB0aW1lZCBvdXQnKTtcclxuXHJcbi8vICAgICAvLyBSZXNldCBCdXkgUHJvIGJ1dHRvblxyXG4vLyAgICAgY29uc3QgYnV5UHJvQnRuID0gJCgnI2J1eS1wcm8tYnRuJyk7XHJcbi8vICAgICBpZiAoYnV5UHJvQnRuKSB7XHJcbi8vICAgICAgICAgYnV5UHJvQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbi8vICAgICAgICAgYnV5UHJvQnRuLmlubmVySFRNTCA9ICfwn5KOIEJ1eSBQcm8nO1xyXG4vLyAgICAgfVxyXG5cclxuLy8gICAgIC8vIFNob3cgdGltZW91dCBtZXNzYWdlXHJcbi8vICAgICBzaG93RXJyb3IoJ1B1cmNoYXNlIHBvbGxpbmcgdGltZWQgb3V0LiBJZiB5b3UgY29tcGxldGVkIHRoZSBwdXJjaGFzZSwgcGxlYXNlIHJlZnJlc2ggdGhlIHBhZ2Ugb3IgcmVzdGFydCB0aGUgZXh0ZW5zaW9uLicpO1xyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiBzaG93U3VjY2VzcyhtZXNzYWdlKSB7XHJcbi8vICAgICBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdzdWNjZXNzJyk7XHJcbi8vIH1cclxuXHJcbi8vIGZ1bmN0aW9uIHNob3dFcnJvcihtZXNzYWdlKSB7XHJcbi8vICAgICBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdlcnJvcicpO1xyXG4vLyB9XHJcblxyXG4vLyBmdW5jdGlvbiBzaG93Tm90aWZpY2F0aW9uKG1lc3NhZ2UsIHR5cGUgPSAnaW5mbycpIHtcclxuLy8gICAgIC8vIENyZWF0ZSBub3RpZmljYXRpb24gZWxlbWVudFxyXG4vLyAgICAgY29uc3Qgbm90aWZpY2F0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbi8vICAgICBub3RpZmljYXRpb24uY2xhc3NOYW1lID0gYG5vdGlmaWNhdGlvbiBub3RpZmljYXRpb24tJHt0eXBlfWA7XHJcbi8vICAgICBub3RpZmljYXRpb24udGV4dENvbnRlbnQgPSBtZXNzYWdlO1xyXG5cclxuLy8gICAgIC8vIEFkZCBzdHlsZXNcclxuLy8gICAgIE9iamVjdC5hc3NpZ24obm90aWZpY2F0aW9uLnN0eWxlLCB7XHJcbi8vICAgICAgICAgcG9zaXRpb246ICdmaXhlZCcsXHJcbi8vICAgICAgICAgdG9wOiAnMjBweCcsXHJcbi8vICAgICAgICAgcmlnaHQ6ICcyMHB4JyxcclxuLy8gICAgICAgICBwYWRkaW5nOiAnMTJweCAyMHB4JyxcclxuLy8gICAgICAgICBib3JkZXJSYWRpdXM6ICc4cHgnLFxyXG4vLyAgICAgICAgIGNvbG9yOiAnd2hpdGUnLFxyXG4vLyAgICAgICAgIGZvbnRXZWlnaHQ6ICc1MDAnLFxyXG4vLyAgICAgICAgIHpJbmRleDogJzEwMDAwJyxcclxuLy8gICAgICAgICB0cmFuc2Zvcm06ICd0cmFuc2xhdGVYKDEwMCUpJyxcclxuLy8gICAgICAgICB0cmFuc2l0aW9uOiAndHJhbnNmb3JtIDAuM3MgZWFzZScsXHJcbi8vICAgICAgICAgbWF4V2lkdGg6ICczMDBweCcsXHJcbi8vICAgICAgICAgd29yZFdyYXA6ICdicmVhay13b3JkJ1xyXG4vLyAgICAgfSk7XHJcblxyXG4vLyAgICAgLy8gU2V0IGJhY2tncm91bmQgY29sb3IgYmFzZWQgb24gdHlwZVxyXG4vLyAgICAgc3dpdGNoICh0eXBlKSB7XHJcbi8vICAgICAgICAgY2FzZSAnc3VjY2Vzcyc6XHJcbi8vICAgICAgICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzM0YTg1Myc7XHJcbi8vICAgICAgICAgICAgIGJyZWFrO1xyXG4vLyAgICAgICAgIGNhc2UgJ2Vycm9yJzpcclxuLy8gICAgICAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjZWE0MzM1JztcclxuLy8gICAgICAgICAgICAgYnJlYWs7XHJcbi8vICAgICAgICAgZGVmYXVsdDpcclxuLy8gICAgICAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjNDI4NWY0JztcclxuLy8gICAgIH1cclxuXHJcbi8vICAgICAvLyBBZGQgdG8gcGFnZVxyXG4vLyAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub3RpZmljYXRpb24pO1xyXG5cclxuLy8gICAgIC8vIEFuaW1hdGUgaW5cclxuLy8gICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4vLyAgICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgwKSc7XHJcbi8vICAgICB9LCAxMDApO1xyXG5cclxuLy8gICAgIC8vIFJlbW92ZSBhZnRlciBkZWxheVxyXG4vLyAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbi8vICAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDEwMCUpJztcclxuLy8gICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuLy8gICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbi5wYXJlbnROb2RlKSB7XHJcbi8vICAgICAgICAgICAgICAgICBub3RpZmljYXRpb24ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub3RpZmljYXRpb24pO1xyXG4vLyAgICAgICAgICAgICB9XHJcbi8vICAgICAgICAgfSwgMzAwKTtcclxuLy8gICAgIH0sIDMwMDApO1xyXG4vLyB9XHJcblxyXG4vLyAvLyBMaXN0ZW4gZm9yIHN0b3JhZ2UgY2hhbmdlcyB0byB1cGRhdGUgVUlcclxuLy8gY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKChjaGFuZ2VzLCBuYW1lc3BhY2UpID0+IHtcclxuLy8gICAgIGlmIChuYW1lc3BhY2UgPT09ICdsb2NhbCcpIHtcclxuLy8gICAgICAgICBpZiAoY2hhbmdlcy51c2VyRW1haWwgfHwgY2hhbmdlcy51c2VySWQpIHtcclxuLy8gICAgICAgICAgICAgLy8gUmVmcmVzaCBhdXRoIHNlY3Rpb24gd2hlbiB1c2VyIGRhdGEgY2hhbmdlc1xyXG4vLyAgICAgICAgICAgICBnZXRVc2VyRGF0YSgpLnRoZW4oYXN5bmMgdXNlckRhdGEgPT4ge1xyXG4vLyAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlQXV0aFNlY3Rpb24odXNlckRhdGEpO1xyXG4vLyAgICAgICAgICAgICAgICAgLy8gUmUtc2V0dXAgZXZlbnQgbGlzdGVuZXJzIGZvciB0aGUgbmV3IGJ1dHRvbnNcclxuLy8gICAgICAgICAgICAgICAgIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuLy8gICAgICAgICAgICAgfSk7XHJcbi8vICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICBpZiAoY2hhbmdlcy5pc1BhaWRWZXJzaW9uKSB7XHJcbi8vICAgICAgICAgICAgIC8vIFVwZGF0ZSB2ZXJzaW9uIHN0YXR1cyB3aGVuIHBheW1lbnQgc3RhdHVzIGNoYW5nZXNcclxuLy8gICAgICAgICAgICAgdXBkYXRlVmVyc2lvblN0YXR1cyhjaGFuZ2VzLmlzUGFpZFZlcnNpb24ubmV3VmFsdWUgfHwgZmFsc2UpO1xyXG4vLyAgICAgICAgICAgICAvL3VwZGF0ZUJ1eVByb0J1dHRvbihjaGFuZ2VzLmlzUGFpZFZlcnNpb24ubmV3VmFsdWUgfHwgZmFsc2UpO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfSk7XHJcblxyXG4vLyAvLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gYmFja2dyb3VuZCBzY3JpcHRcclxuLy8gY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGFzeW5jIChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4vLyAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnYXV0aGVudGljYXRpb25Db21wbGV0ZScpIHtcclxuLy8gICAgICAgICAvLyBSZWZyZXNoIHRoZSBwYWdlIHdoZW4gYXV0aGVudGljYXRpb24gY29tcGxldGVzXHJcbi8vICAgICAgICAgY29uc3QgdXNlckRhdGEgPSBhd2FpdCBnZXRVc2VyRGF0YSgpO1xyXG4vLyAgICAgICAgIGF3YWl0IHVwZGF0ZUF1dGhTZWN0aW9uKHVzZXJEYXRhKTtcclxuXHJcbi8vICAgICAgICAgLy8gUmUtc2V0dXAgZXZlbnQgbGlzdGVuZXJzIGZvciB0aGUgbmV3IGJ1dHRvbnNcclxuLy8gICAgICAgICBzZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcblxyXG4vLyAgICAgICAgIC8vIENoZWNrIHBheW1lbnQgc3RhdHVzIGZvciB0aGUgbmV3bHkgc2lnbmVkLWluIHVzZXJcclxuLy8gICAgICAgICBpZiAodXNlckRhdGEudXNlckVtYWlsICYmIHVzZXJEYXRhLnVzZXJJZCkge1xyXG4vLyAgICAgICAgICAgICAvL2F3YWl0IGNoZWNrUGF5bWVudFN0YXR1cyh1c2VyRGF0YSk7XHJcbi8vICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICBzaG93U3VjY2VzcygnQXV0aGVudGljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKTtcclxuXHJcbi8vICAgICAgICAgLy8gUmVzZXQgc2lnbi1pbiBidXR0b24gaWYgaXQgZXhpc3RzXHJcbi8vICAgICAgICAgY29uc3Qgc2lnbkluQnRuID0gJCgnI3NpZ24taW4tYnRuJyk7XHJcbi8vICAgICAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4vLyAgICAgICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuLy8gICAgICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICfwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGUnO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfSk7XHJcblxyXG4vLyBmdW5jdGlvbiBub3RpZnlDb250ZW50U2NyaXB0KCkge1xyXG4vLyAgICAgLy8gTm90aWZ5IGFsbCB0YWJzIGFib3V0IHBheW1lbnQgc3RhdHVzIHVwZGF0ZVxyXG4vLyAgICAgY2hyb21lLnRhYnMucXVlcnkoe30sICh0YWJzKSA9PiB7XHJcbi8vICAgICAgICAgdGFicy5mb3JFYWNoKHRhYiA9PiB7XHJcbi8vICAgICAgICAgICAgIGlmICh0YWIudXJsICYmIHRhYi51cmwuaW5jbHVkZXMoJ3Bob3Rvcy5nb29nbGUuY29tJykpIHtcclxuLy8gICAgICAgICAgICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwge1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ3BheW1lbnRTdGF0dXNVcGRhdGVkJ1xyXG4vLyAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgZm9yIHRhYnMgd2l0aG91dCBjb250ZW50IHNjcmlwdFxyXG4vLyAgICAgICAgICAgICAgICAgfSk7XHJcbi8vICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICB9KTtcclxuLy8gICAgIH0pO1xyXG4vLyB9IFxyXG5cclxuLy8gdmFyIGV4dGVuc2lvblBhZ2VPYmogPSB7XHJcbi8vICAgICBhZGRFdmVudHM6IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuLy8gICAgICAgICAkKGRvY3VtZW50KS5vbihcImNsaWNrXCIsICcjc2lnbi1vdXQtYnRuJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbi8vICAgICAgICAgICAgIGhhbmRsZVNpZ25PdXQoKVxyXG4vLyAgICAgICAgIH0pO1xyXG5cclxuLy8gICAgICAgICAkKGRvY3VtZW50KS5vbihcImNsaWNrXCIsICcjb3Blbi1waG90b3MtYnRuJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbi8vICAgICAgICAgICAgIGhhbmRsZU9wZW5QaG90b3MoKTtcclxuLy8gICAgICAgICB9KTtcclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLy8gJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xyXG4vLyAgICAgZXh0ZW5zaW9uUGFnZU9iai5hZGRFdmVudHMoKTtcclxuLy8gfSlcclxuXHJcblxyXG5cclxuLy8gZXh0ZW5zaW9uLXBhZ2UuanMgXHJcblxyXG5cclxuLy8gIEFmdGVyIFVwZGF0ZTogXHJcblxyXG4gLy8gSW5pdGlhbGl6ZSBGaXJlYmFzZVxyXG5cclxuY29uc3QgZmlyZWJhc2VDb25maWcgPSB7XHJcbiAgYXBpS2V5OiBcIkFJemFTeUNDNlNpbEJzZFlndEpWTDJMR0xpZXdoSlhNYU5xTXJXSVwiLFxyXG4gIGF1dGhEb21haW46IFwiZHVwZXlha3Rlc3QuZmlyZWJhc2VhcHAuY29tXCIsXHJcbiAgcHJvamVjdElkOiBcImR1cGV5YWt0ZXN0XCIsXHJcbiAgc3RvcmFnZUJ1Y2tldDogXCJkdXBleWFrdGVzdC5maXJlYmFzZXN0b3JhZ2UuYXBwXCIsXHJcbiAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiODIwOTkwNDAzMjA0XCIsXHJcbiAgYXBwSWQ6IFwiMTo4MjA5OTA0MDMyMDQ6d2ViOjJhODUwYzk1ZDlkMWUzODQ4ZWQ4ZDFcIixcclxuICBtZWFzdXJlbWVudElkOiBcIkctOVI1M1NERTFIWVwiXHJcbn07XHJcblxyXG5cclxuY29uc3QgYXBwID0gZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChmaXJlYmFzZUNvbmZpZyk7XHJcbmNvbnN0IGF1dGggPSBmaXJlYmFzZS5hdXRoKCk7XHJcbmNvbnN0IGRiID0gZmlyZWJhc2UuZmlyZXN0b3JlKCk7XHJcbmNvbnN0IHNldERvYyA9IGZpcmViYXNlLmZpcmVzdG9yZSgpO1xyXG5jb25zdCBkb2MgPSBmaXJlYmFzZS5maXJlc3RvcmUoKTtcclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiBzdG9yZVVzZXJJbkZpcmVzdG9yZSh1c2VySW5mbykge1xyXG4gICAgIHJldHVybiBkYi5jb2xsZWN0aW9uKFwidXNlcnNcIikuZG9jKHVzZXJJbmZvLmlkKS5zZXQoe1xyXG4gICAgbmFtZTogdXNlckluZm8ubmFtZSxcclxuICAgIGVtYWlsOiB1c2VySW5mby5lbWFpbCxcclxuICAgIHBpY3R1cmU6IHVzZXJJbmZvLnBpY3R1cmUsXHJcbiAgICBsb2dnZWRJbkF0OiBuZXcgRGF0ZSgpLFxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQXV0aFN1Y2Nlc3ModXNlckluZm8pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHtcclxuICAgICAgICAgICAgICAgICAgICB1c2VyRW1haWw6IHVzZXJJbmZvLmVtYWlsLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJJZDogdXNlckluZm8uaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0aFRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG4gICAgICAgICAgICAgICAgfSwgcmVzb2x2ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBoYW5kbGUgT0F1dGggc3VjY2VzczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgIGluaXRNYWluUGFnZSgpO1xyXG59KTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXRNYWluUGFnZSgpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgc2hvd1ZlcnNpb25JbmZvKCk7XHJcbiAgICAgICAgY29uc3QgdXNlckRhdGEgPSBhd2FpdCBmZXRjaFVzZXJEYXRhKCk7XHJcbiAgICAgICAgYXdhaXQgcmVmcmVzaEF1dGhVSSh1c2VyRGF0YSk7XHJcbiAgICAgICAgaWYgKHVzZXJEYXRhLnVzZXJFbWFpbCAmJiB1c2VyRGF0YS51c2VySWQpIHtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBiaW5kRXZlbnRIYW5kbGVycygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluaXRpYWxpemluZyBwYWdlOicsIGVycm9yKTtcclxuICAgICAgICBkaXNwbGF5RXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIGV4dGVuc2lvbiBwYWdlJyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dWZXJzaW9uSW5mbygpIHtcclxuICAgIGNvbnN0IHZlcnNpb25FbGVtZW50ID0gJCgnI2V4dGVuc2lvbi12ZXJzaW9uJyk7XHJcbiAgICBpZiAodmVyc2lvbkVsZW1lbnQpIHtcclxuICAgICAgICBjb25zdCBtYW5pZmVzdCA9IGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCk7XHJcbiAgICAgICAgdmVyc2lvbkVsZW1lbnQudGV4dENvbnRlbnQgPSBgdiR7bWFuaWZlc3QudmVyc2lvbn1gO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRBcHBUaXRsZSgpIHtcclxuICAgIGNvbnN0IHRpdGxlRWxlbWVudCA9ICQoJyNhcHAtdGl0bGUnKTtcclxuICAgIGlmICh0aXRsZUVsZW1lbnQpIHtcclxuICAgICAgICAgICAgdGl0bGVFbGVtZW50LnRleHRDb250ZW50ID0gJ0R1cGVZYWsgRHVwbGljYXRlIFJlbW92ZXInO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRWZXJzaW9uU3RhdHVzKCkge1xyXG4gICAgc2V0QXBwVGl0bGUoKTtcclxuICAgIHNob3dWZXJzaW9uSW5mbygpO1xyXG5cclxufVxyXG5hc3luYyBmdW5jdGlvbiBmZXRjaFVzZXJEYXRhKCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsndXNlckVtYWlsJywgJ3VzZXJJZCddLCAocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiByZWZyZXNoQXV0aFVJKHVzZXJJbmZvKSB7XHJcbiAgICBjb25zdCBhY2NvdW50U2VjdGlvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hY2NvdW50LXNlY3Rpb24nKTtcclxuXHJcbiAgICBpZiAodXNlckluZm8udXNlckVtYWlsICYmIHVzZXJJbmZvLnVzZXJJZCkge1xyXG4gICAgICAgIGFjY291bnRTZWN0aW9uLmlubmVySFRNTCA9IGJ1aWxkU2lnbmVkSW5WaWV3KHVzZXJJbmZvLnVzZXJFbWFpbCk7XHJcbiAgICAgICAgc2V0QXBwVGl0bGUoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYWNjb3VudFNlY3Rpb24uaW5uZXJIVE1MID0gYnVpbGRTaWduSW5WaWV3KCk7XHJcbiAgICAgICAgc2V0QXBwVGl0bGUoZmFsc2UpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBidWlsZFNpZ25lZEluVmlldyhlbWFpbCkge1xyXG4gICAgY29uc3QgYnV0dG9ucyA9IFtcclxuICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgaWQ9XCJvcGVuLXBob3Rvcy1idG5cIj5cclxuICAgICAgICAgICAg8J+TuCBPcGVuIEdvb2dsZSBQaG90b3NcclxuICAgICAgICA8L2J1dHRvbj5gXHJcbiAgICBdO1xyXG4gICAgYnV0dG9ucy5wdXNoKGA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1kYW5nZXJcIiBpZD1cInNpZ24tb3V0LWJ0blwiPlxyXG4gICAgICAgIPCfmqogU2lnbiBPdXRcclxuICAgIDwvYnV0dG9uPmApO1xyXG5cclxuICAgIHJldHVybiBgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtaW5mb1wiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1kZXRhaWxzXCI+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1sYWJlbFwiPlNpZ25lZCBpbiBhczo8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWVtYWlsXCI+JHtlbWFpbH08L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWFjdGlvbnNcIj5cclxuICAgICAgICAgICAgICAgICR7YnV0dG9ucy5qb2luKCdcXG4gICAgICAgICAgICAgICAgJyl9XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgYDtcclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRTaWduSW5WaWV3KCkge1xyXG4gICAgcmV0dXJuIGBcclxuICAgICAgICA8ZGl2IGNsYXNzPVwic2lnbmluLWNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgICA8aDIgY2xhc3M9XCJzaWduaW4tdGl0bGVcIj5XZWxjb21lIHRvIER1cGVZYWsgRHVwbGljYXRlIFJlbW92ZXI8L2gyPlxyXG4gICAgICAgICAgICA8cCBjbGFzcz1cInNpZ25pbi1zdWJ0aXRsZVwiPlNpZ24gaW4gd2l0aCB5b3VyIEdvb2dsZSBhY2NvdW50IHRvIGdldCBzdGFydGVkLCBidXkgUFJPIG9yIHJlc3RvcmUgeW91ciBsaWNlbnNlPC9wPlxyXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5XCIgaWQ9XCJzaWduLWluLWJ0blwiPlxyXG4gICAgICAgICAgICAgICAg8J+UkCBTaWduIGluIHdpdGggR29vZ2xlXHJcbiAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgYDtcclxufVxyXG5cclxuZnVuY3Rpb24gYmluZEV2ZW50SGFuZGxlcnMoKSB7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNpZ24taW4tYnRuXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY2hyb21lLmlkZW50aXR5LmxhdW5jaFdlYkF1dGhGbG93KFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGBodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aD9jbGllbnRfaWQ9OTA0MDkzODAwMjI2LWdkc2IxN2w0MG0wY2xqc3RlbnI3bXV2aWlnczVxYTlrLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJnJlc3BvbnNlX3R5cGU9dG9rZW4mcmVkaXJlY3RfdXJpPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNocm9tZS5pZGVudGl0eS5nZXRSZWRpcmVjdFVSTCgncHJvdmlkZXJfY2InKSl9JnNjb3BlPXByb2ZpbGUgZW1haWxgLFxyXG4gICAgICAgICAgICAgICAgaW50ZXJhY3RpdmU6IHRydWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZnVuY3Rpb24gKHJlZGlyZWN0VXJsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkxvZ2luIGZhaWxlZDpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhuZXcgVVJMKHJlZGlyZWN0VXJsKS5oYXNoLnN1YnN0cmluZygxKSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IHBhcmFtcy5nZXQoXCJhY2Nlc3NfdG9rZW5cIik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBHb29nbGUgVXNlciBJbmZvIEFQSVxyXG4gICAgICAgICAgICAgICAgZmV0Y2goXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjIvdXNlcmluZm9cIiwge1xyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oYXN5bmMgdXNlckluZm8gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVzZXIgaW5mbzpcIiwgdXNlckluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVBdXRoU3VjY2Vzcyh1c2VySW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZVVzZXJJbkZpcmVzdG9yZSh1c2VySW5mbylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuXHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgc2lnbk91dEJ0biA9ICQoJyNzaWduLW91dC1idG4nKTtcclxuICAgIGlmIChzaWduT3V0QnRuLmxlbmd0aCkge1xyXG4gICAgICAgIHNpZ25PdXRCdG4ub24oJ2NsaWNrJywgb25Vc2VyU2lnbk91dCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgb3BlblBob3Rvc0J0biA9ICQoJyNvcGVuLXBob3Rvcy1idG4nKTtcclxuICAgIGlmIChvcGVuUGhvdG9zQnRuLmxlbmd0aCkge1xyXG4gICAgICAgIG9wZW5QaG90b3NCdG4ub24oJ2NsaWNrJywgb25PcGVuUGhvdG9zKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiBvblVzZXJTaWduSW4oKSB7XHJcbiAgICBjb25zdCBzaWduSW5CdG4gPSAkKCcjc2lnbi1pbi1idG4nKTtcclxuICAgIGlmIChzaWduSW5CdG4pIHtcclxuICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIHNpZ25JbkJ0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gT3BlbmluZyBHb29nbGUgT0F1dGguLi4nO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICBhY3Rpb246ICdhdXRoZW50aWNhdGUnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICBpZiAoc2lnbkluQnRuKSB7XHJcbiAgICAgICAgICAgICAgICBzaWduSW5CdG4uaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+IENvbXBsZXRlIHNpZ24taW4gaW4gdGhlIG9wZW5lZCB0YWIuLi4nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRpc3BsYXlTdWNjZXNzKCdBdXRoZW50aWNhdGlvbiB0YWIgb3BlbmVkISBQbGVhc2UgY29tcGxldGUgc2lnbi1pbiBpbiB0aGUgbmV3IHRhYi4nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yIHx8ICdBdXRoZW50aWNhdGlvbiBmYWlsZWQnKTtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpZ24gaW4gZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRmFpbGVkIHRvIHN0YXJ0IGF1dGhlbnRpY2F0aW9uLiBQbGVhc2UgdHJ5IGFnYWluLicpO1xyXG4gICAgICAgIGlmIChzaWduSW5CdG4pIHtcclxuICAgICAgICAgICAgc2lnbkluQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNpZ25JbkJ0bi5pbm5lckhUTUwgPSAn8J+UkCBTaWduIGluIHdpdGggR29vZ2xlJztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG9uVXNlclNpZ25PdXQoKSB7XHJcbiAgICBjb25zdCBzaWduT3V0QnRuID0gJCgnI3NpZ24tb3V0LWJ0bicpO1xyXG4gICAgaWYgKHNpZ25PdXRCdG4pIHtcclxuICAgICAgICBzaWduT3V0QnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICBzaWduT3V0QnRuLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjwvZGl2PiBTaWduaW5nIG91dC4uLic7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5yZW1vdmUoW1xyXG4gICAgICAgICAgICAgICAgJ3VzZXJFbWFpbCcsXHJcbiAgICAgICAgICAgICAgICAndXNlcklkJyxcclxuICAgICAgICAgICAgICAgICdpc1BhaWRWZXJzaW9uJyxcclxuICAgICAgICAgICAgICAgICdsYXN0UGFpZFN0YXR1c0NoZWNrJyxcclxuICAgICAgICAgICAgICAgICdwYXltZW50RGF0YSdcclxuICAgICAgICAgICAgXSwgcmVzb2x2ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYXdhaXQgcmVmcmVzaEF1dGhVSSh7fSk7XHJcbiAgICAgICAgYmluZEV2ZW50SGFuZGxlcnMoKTtcclxuICAgICAgICBzZXRBcHBUaXRsZShmYWxzZSk7XHJcbiAgICAgICAgLy8gbm90aWZ5Q29udGVudFNjcmlwdCgpO1xyXG5cclxuICAgICAgICBkaXNwbGF5U3VjY2VzcygnU3VjY2Vzc2Z1bGx5IHNpZ25lZCBvdXQhJyk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpZ24gb3V0IGVycm9yOicsIGVycm9yKTtcclxuICAgICAgICBkaXNwbGF5RXJyb3IoJ0ZhaWxlZCB0byBzaWduIG91dC4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgY29uc3Qgc2lnbk91dEJ0biA9ICQoJyNzaWduLW91dC1idG4nKTtcclxuICAgICAgICBpZiAoc2lnbk91dEJ0bikge1xyXG4gICAgICAgICAgICBzaWduT3V0QnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNpZ25PdXRCdG4uaW5uZXJIVE1MID0gJ/CfmqogU2lnbiBPdXQnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gb25PcGVuUGhvdG9zKCkge1xyXG4gICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiAnaHR0cHM6Ly9waG90b3MuZ29vZ2xlLmNvbScgfSk7XHJcbn1cclxuZnVuY3Rpb24gZGlzcGxheVN1Y2Nlc3MobWVzc2FnZSkge1xyXG4gICAgZGlzcGxheU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNwbGF5RXJyb3IobWVzc2FnZSkge1xyXG4gICAgZGlzcGxheU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnZXJyb3InKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzcGxheU5vdGlmaWNhdGlvbihtZXNzYWdlLCB0eXBlID0gJ2luZm8nKSB7XHJcbiAgICBjb25zdCBub3RpZmljYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIG5vdGlmaWNhdGlvbi5jbGFzc05hbWUgPSBgbm90aWZpY2F0aW9uIG5vdGlmaWNhdGlvbi0ke3R5cGV9YDtcclxuICAgIG5vdGlmaWNhdGlvbi50ZXh0Q29udGVudCA9IG1lc3NhZ2U7XHJcblxyXG4gICAgT2JqZWN0LmFzc2lnbihub3RpZmljYXRpb24uc3R5bGUsIHtcclxuICAgICAgICBwb3NpdGlvbjogJ2ZpeGVkJyxcclxuICAgICAgICB0b3A6ICcyMHB4JyxcclxuICAgICAgICByaWdodDogJzIwcHgnLFxyXG4gICAgICAgIHBhZGRpbmc6ICcxMnB4IDIwcHgnLFxyXG4gICAgICAgIGJvcmRlclJhZGl1czogJzhweCcsXHJcbiAgICAgICAgY29sb3I6ICd3aGl0ZScsXHJcbiAgICAgICAgZm9udFdlaWdodDogJzUwMCcsXHJcbiAgICAgICAgekluZGV4OiAnMTAwMDAnLFxyXG4gICAgICAgIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVgoMTAwJSknLFxyXG4gICAgICAgIHRyYW5zaXRpb246ICd0cmFuc2Zvcm0gMC4zcyBlYXNlJyxcclxuICAgICAgICBtYXhXaWR0aDogJzMwMHB4JyxcclxuICAgICAgICB3b3JkV3JhcDogJ2JyZWFrLXdvcmQnXHJcbiAgICB9KTtcclxuXHJcbiAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICBjYXNlICdzdWNjZXNzJzpcclxuICAgICAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjMzRhODUzJztcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAnZXJyb3InOlxyXG4gICAgICAgICAgICBub3RpZmljYXRpb24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNlYTQzMzUnO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICBub3RpZmljYXRpb24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyM0Mjg1ZjQnO1xyXG4gICAgfVxyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub3RpZmljYXRpb24pO1xyXG5cclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgwKSc7XHJcbiAgICB9LCAxMDApO1xyXG5cclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgxMDAlKSc7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChub3RpZmljYXRpb24ucGFyZW50Tm9kZSkge1xyXG4gICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm90aWZpY2F0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDMwMCk7XHJcbiAgICB9LCAzMDAwKTtcclxufVxyXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xyXG4gICAgaWYgKG5hbWVzcGFjZSA9PT0gJ2xvY2FsJykge1xyXG4gICAgICAgIGlmIChjaGFuZ2VzLnVzZXJFbWFpbCB8fCBjaGFuZ2VzLnVzZXJJZCkge1xyXG4gICAgICAgICAgICBmZXRjaFVzZXJEYXRhKCkudGhlbihhc3luYyB1c2VyRGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCByZWZyZXNoQXV0aFVJKHVzZXJEYXRhKTtcclxuICAgICAgICAgICAgICAgIGJpbmRFdmVudEhhbmRsZXJzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihhc3luYyAobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ2F1dGhlbnRpY2F0aW9uQ29tcGxldGUnKSB7XHJcbiAgICAgICAgY29uc3QgdXNlckRhdGEgPSBhd2FpdCBmZXRjaFVzZXJEYXRhKCk7XHJcbiAgICAgICAgYXdhaXQgcmVmcmVzaEF1dGhVSSh1c2VyRGF0YSk7XHJcbiAgICAgICAgYmluZEV2ZW50SGFuZGxlcnMoKTtcclxuICAgICAgICBpZiAodXNlckRhdGEudXNlckVtYWlsICYmIHVzZXJEYXRhLnVzZXJJZCkge1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGlzcGxheVN1Y2Nlc3MoJ0F1dGhlbnRpY2F0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkhJyk7XHJcblxyXG4gICAgICAgIGNvbnN0IHNpZ25JbkJ0biA9ICQoJyNzaWduLWluLWJ0bicpO1xyXG4gICAgICAgIGlmIChzaWduSW5CdG4pIHtcclxuICAgICAgICAgICAgc2lnbkluQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNpZ25JbkJ0bi5pbm5lckhUTUwgPSAn8J+UkCBTaWduIGluIHdpdGggR29vZ2xlJztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuLy8gZnVuY3Rpb24gbm90aWZ5Q29udGVudFNjcmlwdCgpIHtcclxuLy8gICAgIGNocm9tZS50YWJzLnF1ZXJ5KHt9LCAodGFicykgPT4ge1xyXG4vLyAgICAgICAgIHRhYnMuZm9yRWFjaCh0YWIgPT4ge1xyXG4vLyAgICAgICAgICAgICBpZiAodGFiLnVybCAmJiB0YWIudXJsLmluY2x1ZGVzKCdwaG90b3MuZ29vZ2xlLmNvbScpKSB7XHJcbi8vICAgICAgICAgICAgICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQsIHtcclxuLy8gICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdwYXltZW50U3RhdHVzVXBkYXRlZCdcclxuLy8gICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHtcclxuLy8gICAgICAgICAgICAgICAgIH0pO1xyXG4vLyAgICAgICAgICAgICB9XHJcbi8vICAgICAgICAgfSk7XHJcbi8vICAgICB9KTtcclxuLy8gfSBcclxuXHJcbnZhciBleHRlbnNpb25QYWdlQ29yZSA9IHtcclxuICAgIGFkZEV2ZW50czogZnVuY3Rpb24gKHBhcmFtcykge1xyXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKFwiY2xpY2tcIiwgJyNzaWduLW91dC1idG4nLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgb25Vc2VyU2lnbk91dCgpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKFwiY2xpY2tcIiwgJyNvcGVuLXBob3Rvcy1idG4nLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgb25PcGVuUGhvdG9zKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcclxuICAgIGV4dGVuc2lvblBhZ2VDb3JlLmFkZEV2ZW50cygpO1xyXG59KSJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==