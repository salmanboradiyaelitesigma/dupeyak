/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/js/oauth-helper.js":
/*!********************************!*\
  !*** ./src/js/oauth-helper.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// OAuth Helper for DupeYak Duplicate Remover
// Handles OAuth flow with polling approach to avoid browser redirect restrictions
console.log('✅ oauth-helper.js loaded');
class OAuthHelper {
    
    constructor() {
        this.apiBaseUrl = 'https://api.gpdrm.com';
        this.pollInterval = 1000; // Poll every second
        this.maxPollAttempts = 300; // 5 minutes max
    }

    // Start OAuth flow with polling approach
    async startAuthFlow() {
        try {
            console.log('🔐 Starting OAuth flow with polling approach...');

            // Step 1: Request worker to create OAuth session
            const sessionResponse = await fetch(`${this.apiBaseUrl}/oauth/create-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    extensionId: chrome.runtime.id
                })
            });

            if (!sessionResponse.ok) {
                throw new Error('Failed to create OAuth session');
            }

            const { sessionId, authUrl } = await sessionResponse.json();
            console.log('📝 OAuth session created:', sessionId);

            // Step 2: Open auth URL in new tab
            chrome.tabs.create({ url: authUrl });

            // Step 3: Start polling for results
            const result = await this.pollForAuthResult(sessionId);

            if (result.success) {
                console.log('✅ OAuth completed successfully');
                return await this.handleOAuthSuccess(result.userInfo);
            } else {
                throw new Error(result.error || 'OAuth failed');
            }

        } catch (error) {
            console.error('❌ OAuth flow failed:', error);
            throw error;
        }
    }

    // Poll worker for OAuth results
    async pollForAuthResult(sessionId) {
        console.log('🔄 Starting to poll for OAuth results...');

        for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/oauth/check-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        extensionId: chrome.runtime.id
                    })
                });

                if (!response.ok) {
                    console.warn('Poll request failed, retrying...');
                    await this.sleep(this.pollInterval);
                    continue;
                }

                const result = await response.json();

                if (result.status === 'completed') {
                    console.log('🎉 OAuth completed!');
                    return {
                        success: true,
                        userInfo: result.userInfo
                    };
                } else if (result.status === 'error') {
                    return {
                        success: false,
                        error: result.error
                    };
                } else if (result.status === 'pending') {
                    // Still waiting, continue polling
                    console.log(`⏳ Polling attempt ${attempt + 1}/${this.maxPollAttempts}...`);
                    await this.sleep(this.pollInterval);
                    continue;
                } else {
                    throw new Error('Unknown session status: ' + result.status);
                }

            } catch (error) {
                console.warn('Poll attempt failed:', error);
                await this.sleep(this.pollInterval);
            }
        }

        // Polling timed out
        return {
            success: false,
            error: 'OAuth timeout - please try again'
        };
    }

    // Handle successful OAuth
    async handleOAuthSuccess(userInfo) {
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

            // Notify extension page if it's open
            try {
                chrome.runtime.sendMessage({
                    action: 'authenticationComplete',
                    userInfo: userInfo
                });
            } catch (e) {
                // Extension page might not be open, that's ok
            }

            return {
                success: true,
                userInfo: userInfo
            };

        } catch (error) {
            console.error('❌ Failed to handle OAuth success:', error);
            throw error;
        }
    }

    // Get stored user info
    async getUserInfo() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['userEmail', 'userId', 'authTimestamp'], (result) => {
                if (result.userEmail && result.userId) {
                    resolve({
                        email: result.userEmail,
                        id: result.userId,
                        timestamp: result.authTimestamp
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    // Check if user is authenticated
    async isAuthenticated() {
        const userInfo = await this.getUserInfo();
        return userInfo !== null;
    }

    // Sign out user
    async signOut() {
        try {
            console.log('🚪 Signing out user...');

            // Clear stored user data
            await new Promise((resolve) => {
                chrome.storage.local.remove(['userEmail', 'userId', 'authTimestamp'], resolve);
            });

            console.log('✅ User signed out successfully');

            return {
                success: true
            };

        } catch (error) {
            console.error('❌ Sign out failed:', error);
            throw error;
        }
    }

    // Utility function to sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other scripts
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = OAuthHelper;
// } 

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (OAuthHelper);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!******************************!*\
  !*** ./src/js/background.js ***!
  \******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _oauth_helper_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./oauth-helper.js */ "./src/js/oauth-helper.js");
// Google Photos Duplicate Remover - Background Service Worker

// Import OAuth helper
//  importScripts('oauth-helper.js');
 


// Debug Configuration
const DEBUG_ENABLED = false; // Set to false for production

// Store original console methods
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// Override console methods based on debug flag
if (!DEBUG_ENABLED) {
    console.log = function () { };
    console.info = function () { };
    console.debug = function () { };
    // Keep console.warn and console.error for important messages
}

class BackgroundService {
    constructor() {
        this.oauthHelper = new _oauth_helper_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('Google Photos Duplicate Remover - Background Service Started');
    }

    setupEventListeners() {
        // Handle extension icon click - open extension page
        chrome.action.onClicked.addListener(async (tab) => {
            const newTab = await chrome.tabs.create({
                url: chrome.runtime.getURL('html/extension-page.html'),
                active: true
            });

            // Focus the window containing the new tab
            if (newTab && newTab.windowId) {
                await chrome.windows.update(newTab.windowId, { focused: true });
            }
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Handle tab updates to check for Google Photos pages
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Handle messages from content scripts and popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Will respond asynchronously
        });

        // Handle external messages from API worker
        chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
            this.handleExternalMessage(message, sender, sendResponse);
            return true; // Will respond asynchronously
        });
    }

    handleInstallation(details) {
        if (details.reason === 'install') {
            console.log('Extension installed for the first time');

            // Set default settings
            chrome.storage.local.set({
                serverUrl: 'http://localhost:8095',
                similarityThreshold: 85,
                installDate: Date.now()
            });

            // Open welcome page
            chrome.tabs.create({
                url: 'https://photos.google.com'
            });
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        // Only process when the page is fully loaded
        if (changeInfo.status !== 'complete') return;

        // Check if we're on a Google Photos page
        if (tab.url && tab.url.includes('photos.google.com')) {
            this.updateIconForGooglePhotos(tabId, tab.url);
        } else {
            this.updateIconDefault(tabId);
        }
    }

    updateIconForGooglePhotos(tabId, url) {
        // Update icon to show we're active on Google Photos
        chrome.action.setBadgeText({
            tabId: tabId,
            text: '●'
        });

        chrome.action.setBadgeBackgroundColor({
            tabId: tabId,
            color: '#4285f4'
        });

        // Update title based on page type
        // Check for both standard and account-specific search URLs
        const isSearchPage = url.includes('/search/') || url.match(/\/u\/\d+\/search\//);
        if (isSearchPage) {
            chrome.action.setTitle({
                tabId: tabId,
                title: 'Google Photos Duplicate Remover - Search page detected!'
            });
        } else {
            chrome.action.setTitle({
                tabId: tabId,
                title: 'Google Photos Duplicate Remover - Navigate to search to find duplicates'
            });
        }
    }

    updateIconDefault(tabId) {
        // Clear badge when not on Google Photos
        chrome.action.setBadgeText({
            tabId: tabId,
            text: ''
        });

        chrome.action.setTitle({
            tabId: tabId,
            title: 'Google Photos Duplicate Remover - Go to Google Photos to start'
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'logAnalysis':
                    await this.logAnalysisResult(message.results);
                    sendResponse({ success: true });
                    break;

                case 'capturePhoto':
                    await this.handlePhotoCapture(message, sender, sendResponse);
                    break;

                case 'openPopup':
                    await this.openExtensionPopup();
                    sendResponse({ success: true });
                    break;

                case 'downloadInvoice':
                    await this.handleDownloadInvoice(message, sendResponse);
                    break;

                case 'startOAuth':
                    await this.handleStartOAuth(message, sendResponse);
                    break;

                case 'handleOAuthSuccess':
                    await this.handleOAuthSuccess(message, sendResponse);
                    break;

                case 'getUserInfo':
                    await this.handleGetUserInfo(message, sendResponse);
                    break;

                case 'signOut':
                    await this.handleSignOut(message, sendResponse);
                    break;

                case 'verifyOAuthSignature':
                    await this.handleVerifyOAuthSignature(message, sendResponse);
                    break;

                case 'authenticate':
                    await this.handleAuthenticate(message, sendResponse);
                    break;

                case 'generateAuthHash':
                    await this.handleGenerateAuthHash(message, sendResponse);
                    break;

                case 'openExtensionPage':
                    await this.handleOpenExtensionPage(message, sendResponse);
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleExternalMessage(message, sender, sendResponse) {
        try {
            console.log('📨 External message received:', message);

            switch (message.action) {
                case 'oauthSuccess':
                    await this.handleOAuthSuccess(message, sendResponse);
                    break;

                case 'oauthError':
                    console.error('❌ OAuth error from API worker:', message.error);
                    sendResponse({ success: false, error: message.error });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown external action' });
            }
        } catch (error) {
            console.error('Error handling external message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async openExtensionPopup() {
        try {
            // Get the current active tab
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (activeTab) {
                // Open the popup by programmatically triggering the action
                await chrome.action.openPopup();
                console.log('✅ Extension popup opened');
            } else {
                throw new Error('No active tab found');
            }
        } catch (error) {
            console.warn('⚠️ Could not open popup:', error);
            // Fallback: the content script will show an alert
            throw error;
        }
    }

    async handleOpenExtensionPage(message, sendResponse) {
        try {
            console.log('🛒 Opening extension page for purchase...');

            // Open the extension page in a new tab
            const tab = await chrome.tabs.create({
                url: chrome.runtime.getURL('/html/extension-page.html'),
                active: true  // Ensure the new tab is active
            });

            if (tab && tab.id && tab.windowId) {
                // Focus the window containing the new tab
                await chrome.windows.update(tab.windowId, { focused: true });
                console.log('✅ Extension page opened and window focused successfully');
                sendResponse({ success: true, tabId: tab.id });
            } else {
                throw new Error('Failed to create tab');
            }
        } catch (error) {
            console.error('❌ Failed to open extension page:', error);
            sendResponse({ success: false, error: error.message });
        }
    }



    async handleDownloadInvoice(message, sendResponse) {
        try {
            console.log('📄 Getting Google auth data for invoice download...');

            // Get user info using new OAuth helper
            const userInfo = await this.oauthHelper.getUserInfo();
            if (!userInfo) {
                sendResponse({ success: false, error: 'User not authenticated' });
                return;
            }

            const email = userInfo.email;
            const accountId = userInfo.id;

            if (!email || !accountId) {
                sendResponse({ success: false, error: 'Could not get user information' });
                return;
            }

            // Generate authentication hash
            const authHash = await this.generateAuthHash(accountId, message.extensionId);

            console.log('✅ Auth data retrieved for invoice download:', email, 'ID:', accountId);
            sendResponse({
                success: true,
                authData: {
                    accountId: accountId,
                    email: email,
                    authHash: authHash,
                    extensionId: message.extensionId
                }
            });

        } catch (error) {
            console.error('❌ Error handling invoice download request:', error);
            sendResponse({
                success: false,
                error: error.message || 'Authentication failed'
            });
        }
    }

    async handleGenerateAuthHash(message, sendResponse) {
        try {
            const { accountId, extensionId } = message;
            if (!accountId || !extensionId) {
                throw new Error('Missing accountId or extensionId');
            }

            const authHash = await this.generateAuthHash(accountId, extensionId);
            sendResponse({ success: true, authHash });
        } catch (error) {
            console.error('❌ Failed to generate auth hash:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async generateAuthHash(accountId, extensionId) {
        // Generate SHA-1 hash of extension_id + account_id
        const data = extensionId + accountId;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async logAnalysisResult(results) {
        try {
            const timestamp = Date.now();

            // Store latest results
            await chrome.storage.local.set({
                analysisResults: results,
                timestamp: timestamp
            });

            console.log('Analysis result logged:', {
                totalImages: results.total_images,
                similarGroups: results.similar_groups.length,
                timestamp: new Date(timestamp).toISOString()
            });

        } catch (error) {
            console.error('Error logging analysis result:', error);
        }
    }

    async handlePhotoCapture(request, sender, sendResponse) {
        try {
            console.log('Background: Capturing temp image screenshot for:', request.photoId);

            // Step 1: Get element position if elementId is provided
            let elementInfo = null;
            if (request.elementId) {
                elementInfo = await this.getTempElementInfo(request.elementId, sender.tab.id);
                if (!elementInfo) {
                    sendResponse({ success: false, error: 'Could not locate temp element' });
                    return;
                }
            }

            // Step 2: Capture the visible tab
            const screenshot = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
                format: 'jpeg',
                quality: 85
            });

            // Step 3: Crop the screenshot to just the element area (if elementInfo provided)
            let finalImage = screenshot;
            if (elementInfo) {
                finalImage = await this.cropImageToElement(screenshot, elementInfo);
            }

            sendResponse({
                success: true,
                imageData: finalImage,
                width: elementInfo ? elementInfo.width : 1024,
                height: elementInfo ? elementInfo.height : 768,
                photoId: request.photoId
            });

        } catch (error) {
            console.error('Background: Screenshot capture failed:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async getTempElementInfo(elementId, tabId) {
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, {
                action: 'getTempElementInfo',
                elementId: elementId
            }, (response) => {
                resolve(response);
            });
        });
    }

    async cropImageToElement(screenshotDataUrl, elementInfo) {
        try {
            // Convert data URL to blob first
            const response = await fetch(screenshotDataUrl);
            const blob = await response.blob();

            // Use createImageBitmap instead of new Image() (works in service workers)
            const imageBitmap = await createImageBitmap(blob);

            // Create canvas for cropping
            const canvas = new OffscreenCanvas(elementInfo.width, elementInfo.height);
            const ctx = canvas.getContext('2d');

            // Crop the screenshot to just the photo element area
            ctx.drawImage(
                imageBitmap,
                elementInfo.x, elementInfo.y, elementInfo.width, elementInfo.height, // Source rectangle
                0, 0, elementInfo.width, elementInfo.height                        // Destination rectangle
            );

            // Convert back to data URL
            const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });

            // Convert blob to data URL
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(croppedBlob);
            });

        } catch (error) {
            console.error('Error cropping image:', error);
            throw error;
        }
    }

    // Handle authentication from extension page
    async handleAuthenticate(message, sendResponse) {
        try {
            console.log('🔐 Starting authentication flow from extension page...');
            const result = await this.oauthHelper.startAuthFlow();
            sendResponse(result);
        } catch (error) {
            console.error('❌ Failed to start authentication flow:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Handle OAuth flow initiation
    async handleStartOAuth(message, sendResponse) {
        try {
            console.log('🔐 Starting OAuth flow from background...');
            const result = await this.oauthHelper.startAuthFlow();
            sendResponse(result);
        } catch (error) {
            console.error('❌ Failed to start OAuth flow:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Handle OAuth success from API worker
    async handleOAuthSuccess(message, sendResponse) {
        try {
            console.log('🔄 Handling OAuth success in background...');
            const result = await this.oauthHelper.handleOAuthSuccess(message.userInfo);
            sendResponse(result);
        } catch (error) {
            console.error('❌ OAuth success handling failed:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Get user info
    async handleGetUserInfo(message, sendResponse) {
        try {
            const userInfo = await this.oauthHelper.getUserInfo();
            const isAuthenticated = await this.oauthHelper.isAuthenticated();
            sendResponse({
                success: true,
                userInfo: userInfo,
                isAuthenticated: isAuthenticated
            });
        } catch (error) {
            console.error('❌ Failed to get user info:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Handle sign out
    async handleSignOut(message, sendResponse) {
        try {
            console.log('🚪 Signing out user...');
            const result = await this.oauthHelper.signOut();
            sendResponse(result);
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Verify OAuth signature and store user data
    async handleVerifyOAuthSignature(message, sendResponse) {
        try {
            console.log('🔐 Verifying OAuth signature...');

            const { email, id, timestamp, signature } = message;

            // Verify signature using the same method as the server
            const dataToSign = `${email}:${id}:${timestamp}`;
            const expectedSignature = await this.generateSignature(dataToSign);

            if (signature !== expectedSignature) {
                throw new Error('Invalid signature - authentication data may have been tampered with');
            }

            // Store user info if signature is valid
            const userInfo = { email, id };
            const result = await this.oauthHelper.handleOAuthSuccess(userInfo);

            console.log('✅ OAuth signature verified and user data stored');
            sendResponse(result);

        } catch (error) {
            console.error('❌ OAuth signature verification failed:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Generate signature using the same method as the server
    async generateSignature(data) {
        // Use extension ID + client ID as shared secret
        // This ensures only our extension can verify the signature
        const secret = `${chrome.runtime.id}:333200186065-sedmupk2gh8vkve4c8673su04vhqfnc0.apps.googleusercontent.com`;

        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(data);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        const hashArray = Array.from(new Uint8Array(signature));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Initialize the background service
new BackgroundService(); 
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0NBQWtDO0FBQ2xDLG9DQUFvQztBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbURBQW1ELGdCQUFnQjtBQUNuRTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixxQkFBcUI7QUFDekM7QUFDQTtBQUNBO0FBQ0EsaUNBQWlDLGNBQWM7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFjO0FBQ2Q7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhCQUE4QixnQ0FBZ0M7QUFDOUQ7QUFDQSxnREFBZ0QsZ0JBQWdCO0FBQ2hFO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckIsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQjtBQUNsQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQjtBQUNsQjtBQUNBLHFEQUFxRCxZQUFZLEdBQUcscUJBQXFCO0FBQ3pGO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQixrQkFBa0I7QUFDbEI7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpRUFBZSxXQUFXLEVBQUM7Ozs7Ozs7VUM1TTNCO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7O1dDdEJBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EseUNBQXlDLHdDQUF3QztXQUNqRjtXQUNBO1dBQ0EsRTs7Ozs7V0NQQSx3Rjs7Ozs7V0NBQTtXQUNBO1dBQ0E7V0FDQSx1REFBdUQsaUJBQWlCO1dBQ3hFO1dBQ0EsZ0RBQWdELGFBQWE7V0FDN0QsRTs7Ozs7Ozs7Ozs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDNEM7QUFDNUM7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0Isd0RBQVc7QUFDMUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSwrREFBK0QsZUFBZTtBQUM5RTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QixTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekIsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUNBQW1DLGVBQWU7QUFDbEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1DQUFtQyxlQUFlO0FBQ2xEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1DQUFtQyx5Q0FBeUM7QUFDNUU7QUFDQSxVQUFVO0FBQ1Y7QUFDQSwyQkFBMkIsc0NBQXNDO0FBQ2pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUMsc0NBQXNDO0FBQ3pFO0FBQ0E7QUFDQTtBQUNBLG1DQUFtQyxrREFBa0Q7QUFDckY7QUFDQSxVQUFVO0FBQ1Y7QUFDQSwyQkFBMkIsc0NBQXNDO0FBQ2pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBEQUEwRCxtQ0FBbUM7QUFDN0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGNBQWM7QUFDZDtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0EsNERBQTRELGVBQWU7QUFDM0U7QUFDQSwrQkFBK0IsOEJBQThCO0FBQzdELGNBQWM7QUFDZDtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0EsMkJBQTJCLHNDQUFzQztBQUNqRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0IsaURBQWlEO0FBQ2hGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLHlEQUF5RDtBQUN4RjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQix5QkFBeUI7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJCQUEyQix5QkFBeUI7QUFDcEQsVUFBVTtBQUNWO0FBQ0EsMkJBQTJCLHNDQUFzQztBQUNqRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUNBQW1DLHdEQUF3RDtBQUMzRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0EsVUFBVTtBQUNWO0FBQ0EsMkJBQTJCLHNDQUFzQztBQUNqRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0EsYUFBYTtBQUNiLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkRBQTZELG1DQUFtQztBQUNoRztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0EsMkJBQTJCLHNDQUFzQztBQUNqRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQSwyQkFBMkIsc0NBQXNDO0FBQ2pFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBLDJCQUEyQixzQ0FBc0M7QUFDakU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFVBQVU7QUFDVjtBQUNBLDJCQUEyQixzQ0FBc0M7QUFDakU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0EsMkJBQTJCLHNDQUFzQztBQUNqRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLGtDQUFrQztBQUN0RDtBQUNBO0FBQ0Esa0NBQWtDLE1BQU0sR0FBRyxHQUFHLEdBQUcsVUFBVTtBQUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtCQUErQjtBQUMvQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0EsMkJBQTJCLHNDQUFzQztBQUNqRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBCQUEwQixrQkFBa0I7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGNBQWMsK0JBQStCO0FBQzdDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QiIsInNvdXJjZXMiOlsid2VicGFjazovL2xhdGVzdC8uL3NyYy9qcy9vYXV0aC1oZWxwZXIuanMiLCJ3ZWJwYWNrOi8vbGF0ZXN0L3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2xhdGVzdC93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vbGF0ZXN0L3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vbGF0ZXN0L3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vbGF0ZXN0Ly4vc3JjL2pzL2JhY2tncm91bmQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gT0F1dGggSGVscGVyIGZvciBEdXBlWWFrIER1cGxpY2F0ZSBSZW1vdmVyXHJcbi8vIEhhbmRsZXMgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2ggdG8gYXZvaWQgYnJvd3NlciByZWRpcmVjdCByZXN0cmljdGlvbnNcclxuY29uc29sZS5sb2coJ+KchSBvYXV0aC1oZWxwZXIuanMgbG9hZGVkJyk7XHJcbmNsYXNzIE9BdXRoSGVscGVyIHtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5hcGlCYXNlVXJsID0gJ2h0dHBzOi8vYXBpLmdwZHJtLmNvbSc7XHJcbiAgICAgICAgdGhpcy5wb2xsSW50ZXJ2YWwgPSAxMDAwOyAvLyBQb2xsIGV2ZXJ5IHNlY29uZFxyXG4gICAgICAgIHRoaXMubWF4UG9sbEF0dGVtcHRzID0gMzAwOyAvLyA1IG1pbnV0ZXMgbWF4XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RhcnQgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2hcclxuICAgIGFzeW5jIHN0YXJ0QXV0aEZsb3coKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJAgU3RhcnRpbmcgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2guLi4nKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogUmVxdWVzdCB3b3JrZXIgdG8gY3JlYXRlIE9BdXRoIHNlc3Npb25cclxuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvblJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5hcGlCYXNlVXJsfS9vYXV0aC9jcmVhdGUtc2Vzc2lvbmAsIHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXNlc3Npb25SZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIE9BdXRoIHNlc3Npb24nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgeyBzZXNzaW9uSWQsIGF1dGhVcmwgfSA9IGF3YWl0IHNlc3Npb25SZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OdIE9BdXRoIHNlc3Npb24gY3JlYXRlZDonLCBzZXNzaW9uSWQpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAyOiBPcGVuIGF1dGggVVJMIGluIG5ldyB0YWJcclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBhdXRoVXJsIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAzOiBTdGFydCBwb2xsaW5nIGZvciByZXN1bHRzXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucG9sbEZvckF1dGhSZXN1bHQoc2Vzc2lvbklkKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBPQXV0aCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVPQXV0aFN1Y2Nlc3MocmVzdWx0LnVzZXJJbmZvKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZXN1bHQuZXJyb3IgfHwgJ09BdXRoIGZhaWxlZCcpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBPQXV0aCBmbG93IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBQb2xsIHdvcmtlciBmb3IgT0F1dGggcmVzdWx0c1xyXG4gICAgYXN5bmMgcG9sbEZvckF1dGhSZXN1bHQoc2Vzc2lvbklkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgU3RhcnRpbmcgdG8gcG9sbCBmb3IgT0F1dGggcmVzdWx0cy4uLicpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IHRoaXMubWF4UG9sbEF0dGVtcHRzOyBhdHRlbXB0KyspIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5hcGlCYXNlVXJsfS9vYXV0aC9jaGVjay1zZXNzaW9uYCwge1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbklkOiBzZXNzaW9uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdQb2xsIHJlcXVlc3QgZmFpbGVkLCByZXRyeWluZy4uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2xlZXAodGhpcy5wb2xsSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OiSBPQXV0aCBjb21wbGV0ZWQhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlckluZm86IHJlc3VsdC51c2VySW5mb1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMgPT09ICdlcnJvcicpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHJlc3VsdC5lcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMgPT09ICdwZW5kaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0aWxsIHdhaXRpbmcsIGNvbnRpbnVlIHBvbGxpbmdcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg4o+zIFBvbGxpbmcgYXR0ZW1wdCAke2F0dGVtcHQgKyAxfS8ke3RoaXMubWF4UG9sbEF0dGVtcHRzfS4uLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2xlZXAodGhpcy5wb2xsSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gc2Vzc2lvbiBzdGF0dXM6ICcgKyByZXN1bHQuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1BvbGwgYXR0ZW1wdCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCh0aGlzLnBvbGxJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFBvbGxpbmcgdGltZWQgb3V0XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgIGVycm9yOiAnT0F1dGggdGltZW91dCAtIHBsZWFzZSB0cnkgYWdhaW4nXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBIYW5kbGUgc3VjY2Vzc2Z1bCBPQXV0aFxyXG4gICAgYXN5bmMgaGFuZGxlT0F1dGhTdWNjZXNzKHVzZXJJbmZvKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflIQgUHJvY2Vzc2luZyBPQXV0aCBzdWNjZXNzLi4uJyk7XHJcblxyXG4gICAgICAgICAgICAvLyBTdG9yZSB1c2VyIGluZm8gaW4gZXh0ZW5zaW9uIHN0b3JhZ2VcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdXNlckVtYWlsOiB1c2VySW5mby5lbWFpbCxcclxuICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IHVzZXJJbmZvLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dGhUaW1lc3RhbXA6IERhdGUubm93KClcclxuICAgICAgICAgICAgICAgIH0sIHJlc29sdmUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgVXNlciBpbmZvIHN0b3JlZDonLCB1c2VySW5mby5lbWFpbCk7XHJcblxyXG4gICAgICAgICAgICAvLyBOb3RpZnkgZXh0ZW5zaW9uIHBhZ2UgaWYgaXQncyBvcGVuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnYXV0aGVudGljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgdXNlckluZm86IHVzZXJJbmZvXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIHBhZ2UgbWlnaHQgbm90IGJlIG9wZW4sIHRoYXQncyBva1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHVzZXJJbmZvOiB1c2VySW5mb1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIGhhbmRsZSBPQXV0aCBzdWNjZXNzOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBzdG9yZWQgdXNlciBpbmZvXHJcbiAgICBhc3luYyBnZXRVc2VySW5mbygpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsndXNlckVtYWlsJywgJ3VzZXJJZCcsICdhdXRoVGltZXN0YW1wJ10sIChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudXNlckVtYWlsICYmIHJlc3VsdC51c2VySWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW1haWw6IHJlc3VsdC51c2VyRW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHJlc3VsdC5hdXRoVGltZXN0YW1wXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHVzZXIgaXMgYXV0aGVudGljYXRlZFxyXG4gICAgYXN5bmMgaXNBdXRoZW50aWNhdGVkKCkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgdGhpcy5nZXRVc2VySW5mbygpO1xyXG4gICAgICAgIHJldHVybiB1c2VySW5mbyAhPT0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTaWduIG91dCB1c2VyXHJcbiAgICBhc3luYyBzaWduT3V0KCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5qqIFNpZ25pbmcgb3V0IHVzZXIuLi4nKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENsZWFyIHN0b3JlZCB1c2VyIGRhdGFcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShbJ3VzZXJFbWFpbCcsICd1c2VySWQnLCAnYXV0aFRpbWVzdGFtcCddLCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIFVzZXIgc2lnbmVkIG91dCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBTaWduIG91dCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXRpbGl0eSBmdW5jdGlvbiB0byBzbGVlcFxyXG4gICAgc2xlZXAobXMpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIHNjcmlwdHNcclxuLy8gaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbi8vICAgICBtb2R1bGUuZXhwb3J0cyA9IE9BdXRoSGVscGVyO1xyXG4vLyB9IFxyXG5cclxuZXhwb3J0IGRlZmF1bHQgT0F1dGhIZWxwZXI7XHJcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiLy8gR29vZ2xlIFBob3RvcyBEdXBsaWNhdGUgUmVtb3ZlciAtIEJhY2tncm91bmQgU2VydmljZSBXb3JrZXJcclxuXHJcbi8vIEltcG9ydCBPQXV0aCBoZWxwZXJcclxuLy8gIGltcG9ydFNjcmlwdHMoJ29hdXRoLWhlbHBlci5qcycpO1xyXG5pbXBvcnQgT0F1dGhIZWxwZXIgZnJvbSAnLi9vYXV0aC1oZWxwZXIuanMnOyBcclxuXHJcblxyXG4vLyBEZWJ1ZyBDb25maWd1cmF0aW9uXHJcbmNvbnN0IERFQlVHX0VOQUJMRUQgPSBmYWxzZTsgLy8gU2V0IHRvIGZhbHNlIGZvciBwcm9kdWN0aW9uXHJcblxyXG4vLyBTdG9yZSBvcmlnaW5hbCBjb25zb2xlIG1ldGhvZHNcclxuY29uc3Qgb3JpZ2luYWxDb25zb2xlID0ge1xyXG4gICAgbG9nOiBjb25zb2xlLmxvZyxcclxuICAgIHdhcm46IGNvbnNvbGUud2FybixcclxuICAgIGVycm9yOiBjb25zb2xlLmVycm9yLFxyXG4gICAgaW5mbzogY29uc29sZS5pbmZvLFxyXG4gICAgZGVidWc6IGNvbnNvbGUuZGVidWdcclxufTtcclxuXHJcbi8vIE92ZXJyaWRlIGNvbnNvbGUgbWV0aG9kcyBiYXNlZCBvbiBkZWJ1ZyBmbGFnXHJcbmlmICghREVCVUdfRU5BQkxFRCkge1xyXG4gICAgY29uc29sZS5sb2cgPSBmdW5jdGlvbiAoKSB7IH07XHJcbiAgICBjb25zb2xlLmluZm8gPSBmdW5jdGlvbiAoKSB7IH07XHJcbiAgICBjb25zb2xlLmRlYnVnID0gZnVuY3Rpb24gKCkgeyB9O1xyXG4gICAgLy8gS2VlcCBjb25zb2xlLndhcm4gYW5kIGNvbnNvbGUuZXJyb3IgZm9yIGltcG9ydGFudCBtZXNzYWdlc1xyXG59XHJcblxyXG5jbGFzcyBCYWNrZ3JvdW5kU2VydmljZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLm9hdXRoSGVscGVyID0gbmV3IE9BdXRoSGVscGVyKCk7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdCgpIHtcclxuICAgICAgICB0aGlzLnNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnR29vZ2xlIFBob3RvcyBEdXBsaWNhdGUgUmVtb3ZlciAtIEJhY2tncm91bmQgU2VydmljZSBTdGFydGVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0dXBFdmVudExpc3RlbmVycygpIHtcclxuICAgICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIGljb24gY2xpY2sgLSBvcGVuIGV4dGVuc2lvbiBwYWdlXHJcbiAgICAgICAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHRhYikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBuZXdUYWIgPSBhd2FpdCBjaHJvbWUudGFicy5jcmVhdGUoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoJ2h0bWwvZXh0ZW5zaW9uLXBhZ2UuaHRtbCcpLFxyXG4gICAgICAgICAgICAgICAgYWN0aXZlOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gRm9jdXMgdGhlIHdpbmRvdyBjb250YWluaW5nIHRoZSBuZXcgdGFiXHJcbiAgICAgICAgICAgIGlmIChuZXdUYWIgJiYgbmV3VGFiLndpbmRvd0lkKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBjaHJvbWUud2luZG93cy51cGRhdGUobmV3VGFiLndpbmRvd0lkLCB7IGZvY3VzZWQ6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb25cclxuICAgICAgICBjaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoZGV0YWlscykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUluc3RhbGxhdGlvbihkZXRhaWxzKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gSGFuZGxlIHRhYiB1cGRhdGVzIHRvIGNoZWNrIGZvciBHb29nbGUgUGhvdG9zIHBhZ2VzXHJcbiAgICAgICAgY2hyb21lLnRhYnMub25VcGRhdGVkLmFkZExpc3RlbmVyKCh0YWJJZCwgY2hhbmdlSW5mbywgdGFiKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlVGFiVXBkYXRlKHRhYklkLCBjaGFuZ2VJbmZvLCB0YWIpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBIYW5kbGUgbWVzc2FnZXMgZnJvbSBjb250ZW50IHNjcmlwdHMgYW5kIHBvcHVwXHJcbiAgICAgICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gV2lsbCByZXNwb25kIGFzeW5jaHJvbm91c2x5XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEhhbmRsZSBleHRlcm5hbCBtZXNzYWdlcyBmcm9tIEFQSSB3b3JrZXJcclxuICAgICAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2VFeHRlcm5hbC5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVFeHRlcm5hbE1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gV2lsbCByZXNwb25kIGFzeW5jaHJvbm91c2x5XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlSW5zdGFsbGF0aW9uKGRldGFpbHMpIHtcclxuICAgICAgICBpZiAoZGV0YWlscy5yZWFzb24gPT09ICdpbnN0YWxsJykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRXh0ZW5zaW9uIGluc3RhbGxlZCBmb3IgdGhlIGZpcnN0IHRpbWUnKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHNldHRpbmdzXHJcbiAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XHJcbiAgICAgICAgICAgICAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vbG9jYWxob3N0OjgwOTUnLFxyXG4gICAgICAgICAgICAgICAgc2ltaWxhcml0eVRocmVzaG9sZDogODUsXHJcbiAgICAgICAgICAgICAgICBpbnN0YWxsRGF0ZTogRGF0ZS5ub3coKVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIE9wZW4gd2VsY29tZSBwYWdlXHJcbiAgICAgICAgICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdodHRwczovL3Bob3Rvcy5nb29nbGUuY29tJ1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaGFuZGxlVGFiVXBkYXRlKHRhYklkLCBjaGFuZ2VJbmZvLCB0YWIpIHtcclxuICAgICAgICAvLyBPbmx5IHByb2Nlc3Mgd2hlbiB0aGUgcGFnZSBpcyBmdWxseSBsb2FkZWRcclxuICAgICAgICBpZiAoY2hhbmdlSW5mby5zdGF0dXMgIT09ICdjb21wbGV0ZScpIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgb24gYSBHb29nbGUgUGhvdG9zIHBhZ2VcclxuICAgICAgICBpZiAodGFiLnVybCAmJiB0YWIudXJsLmluY2x1ZGVzKCdwaG90b3MuZ29vZ2xlLmNvbScpKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlSWNvbkZvckdvb2dsZVBob3Rvcyh0YWJJZCwgdGFiLnVybCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVJY29uRGVmYXVsdCh0YWJJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUljb25Gb3JHb29nbGVQaG90b3ModGFiSWQsIHVybCkge1xyXG4gICAgICAgIC8vIFVwZGF0ZSBpY29uIHRvIHNob3cgd2UncmUgYWN0aXZlIG9uIEdvb2dsZSBQaG90b3NcclxuICAgICAgICBjaHJvbWUuYWN0aW9uLnNldEJhZGdlVGV4dCh7XHJcbiAgICAgICAgICAgIHRhYklkOiB0YWJJZCxcclxuICAgICAgICAgICAgdGV4dDogJ+KXjydcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2hyb21lLmFjdGlvbi5zZXRCYWRnZUJhY2tncm91bmRDb2xvcih7XHJcbiAgICAgICAgICAgIHRhYklkOiB0YWJJZCxcclxuICAgICAgICAgICAgY29sb3I6ICcjNDI4NWY0J1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBVcGRhdGUgdGl0bGUgYmFzZWQgb24gcGFnZSB0eXBlXHJcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGJvdGggc3RhbmRhcmQgYW5kIGFjY291bnQtc3BlY2lmaWMgc2VhcmNoIFVSTHNcclxuICAgICAgICBjb25zdCBpc1NlYXJjaFBhZ2UgPSB1cmwuaW5jbHVkZXMoJy9zZWFyY2gvJykgfHwgdXJsLm1hdGNoKC9cXC91XFwvXFxkK1xcL3NlYXJjaFxcLy8pO1xyXG4gICAgICAgIGlmIChpc1NlYXJjaFBhZ2UpIHtcclxuICAgICAgICAgICAgY2hyb21lLmFjdGlvbi5zZXRUaXRsZSh7XHJcbiAgICAgICAgICAgICAgICB0YWJJZDogdGFiSWQsXHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0dvb2dsZSBQaG90b3MgRHVwbGljYXRlIFJlbW92ZXIgLSBTZWFyY2ggcGFnZSBkZXRlY3RlZCEnXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNocm9tZS5hY3Rpb24uc2V0VGl0bGUoe1xyXG4gICAgICAgICAgICAgICAgdGFiSWQ6IHRhYklkLFxyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdHb29nbGUgUGhvdG9zIER1cGxpY2F0ZSBSZW1vdmVyIC0gTmF2aWdhdGUgdG8gc2VhcmNoIHRvIGZpbmQgZHVwbGljYXRlcydcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUljb25EZWZhdWx0KHRhYklkKSB7XHJcbiAgICAgICAgLy8gQ2xlYXIgYmFkZ2Ugd2hlbiBub3Qgb24gR29vZ2xlIFBob3Rvc1xyXG4gICAgICAgIGNocm9tZS5hY3Rpb24uc2V0QmFkZ2VUZXh0KHtcclxuICAgICAgICAgICAgdGFiSWQ6IHRhYklkLFxyXG4gICAgICAgICAgICB0ZXh0OiAnJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjaHJvbWUuYWN0aW9uLnNldFRpdGxlKHtcclxuICAgICAgICAgICAgdGFiSWQ6IHRhYklkLFxyXG4gICAgICAgICAgICB0aXRsZTogJ0dvb2dsZSBQaG90b3MgRHVwbGljYXRlIFJlbW92ZXIgLSBHbyB0byBHb29nbGUgUGhvdG9zIHRvIHN0YXJ0J1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGhhbmRsZU1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdsb2dBbmFseXNpcyc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2dBbmFseXNpc1Jlc3VsdChtZXNzYWdlLnJlc3VsdHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnY2FwdHVyZVBob3RvJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVBob3RvQ2FwdHVyZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnb3BlblBvcHVwJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm9wZW5FeHRlbnNpb25Qb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnZG93bmxvYWRJbnZvaWNlJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZURvd25sb2FkSW52b2ljZShtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ3N0YXJ0T0F1dGgnOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlU3RhcnRPQXV0aChtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ2hhbmRsZU9BdXRoU3VjY2Vzcyc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVPQXV0aFN1Y2Nlc3MobWVzc2FnZSwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlICdnZXRVc2VySW5mbyc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVHZXRVc2VySW5mbyhtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ3NpZ25PdXQnOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlU2lnbk91dChtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ3ZlcmlmeU9BdXRoU2lnbmF0dXJlJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVZlcmlmeU9BdXRoU2lnbmF0dXJlKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnYXV0aGVudGljYXRlJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZUF1dGhlbnRpY2F0ZShtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ2dlbmVyYXRlQXV0aEhhc2gnOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlR2VuZXJhdGVBdXRoSGFzaChtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ29wZW5FeHRlbnNpb25QYWdlJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZU9wZW5FeHRlbnNpb25QYWdlKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdVbmtub3duIGFjdGlvbicgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBoYW5kbGluZyBtZXNzYWdlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBoYW5kbGVFeHRlcm5hbE1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TqCBFeHRlcm5hbCBtZXNzYWdlIHJlY2VpdmVkOicsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlLmFjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnb2F1dGhTdWNjZXNzJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZU9BdXRoU3VjY2VzcyhtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ29hdXRoRXJyb3InOlxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBPQXV0aCBlcnJvciBmcm9tIEFQSSB3b3JrZXI6JywgbWVzc2FnZS5lcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBtZXNzYWdlLmVycm9yIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVW5rbm93biBleHRlcm5hbCBhY3Rpb24nIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaGFuZGxpbmcgZXh0ZXJuYWwgbWVzc2FnZTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgb3BlbkV4dGVuc2lvblBvcHVwKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIEdldCB0aGUgY3VycmVudCBhY3RpdmUgdGFiXHJcbiAgICAgICAgICAgIGNvbnN0IFthY3RpdmVUYWJdID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYWN0aXZlVGFiKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBPcGVuIHRoZSBwb3B1cCBieSBwcm9ncmFtbWF0aWNhbGx5IHRyaWdnZXJpbmcgdGhlIGFjdGlvblxyXG4gICAgICAgICAgICAgICAgYXdhaXQgY2hyb21lLmFjdGlvbi5vcGVuUG9wdXAoKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgRXh0ZW5zaW9uIHBvcHVwIG9wZW5lZCcpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBhY3RpdmUgdGFiIGZvdW5kJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ+KaoO+4jyBDb3VsZCBub3Qgb3BlbiBwb3B1cDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiB0aGUgY29udGVudCBzY3JpcHQgd2lsbCBzaG93IGFuIGFsZXJ0XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBoYW5kbGVPcGVuRXh0ZW5zaW9uUGFnZShtZXNzYWdlLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+bkiBPcGVuaW5nIGV4dGVuc2lvbiBwYWdlIGZvciBwdXJjaGFzZS4uLicpO1xyXG5cclxuICAgICAgICAgICAgLy8gT3BlbiB0aGUgZXh0ZW5zaW9uIHBhZ2UgaW4gYSBuZXcgdGFiXHJcbiAgICAgICAgICAgIGNvbnN0IHRhYiA9IGF3YWl0IGNocm9tZS50YWJzLmNyZWF0ZSh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGNocm9tZS5ydW50aW1lLmdldFVSTCgnL2h0bWwvZXh0ZW5zaW9uLXBhZ2UuaHRtbCcpLFxyXG4gICAgICAgICAgICAgICAgYWN0aXZlOiB0cnVlICAvLyBFbnN1cmUgdGhlIG5ldyB0YWIgaXMgYWN0aXZlXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRhYiAmJiB0YWIuaWQgJiYgdGFiLndpbmRvd0lkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGb2N1cyB0aGUgd2luZG93IGNvbnRhaW5pbmcgdGhlIG5ldyB0YWJcclxuICAgICAgICAgICAgICAgIGF3YWl0IGNocm9tZS53aW5kb3dzLnVwZGF0ZSh0YWIud2luZG93SWQsIHsgZm9jdXNlZDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgRXh0ZW5zaW9uIHBhZ2Ugb3BlbmVkIGFuZCB3aW5kb3cgZm9jdXNlZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHRhYklkOiB0YWIuaWQgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdGFiJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIG9wZW4gZXh0ZW5zaW9uIHBhZ2U6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgYXN5bmMgaGFuZGxlRG93bmxvYWRJbnZvaWNlKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OEIEdldHRpbmcgR29vZ2xlIGF1dGggZGF0YSBmb3IgaW52b2ljZSBkb3dubG9hZC4uLicpO1xyXG5cclxuICAgICAgICAgICAgLy8gR2V0IHVzZXIgaW5mbyB1c2luZyBuZXcgT0F1dGggaGVscGVyXHJcbiAgICAgICAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgdGhpcy5vYXV0aEhlbHBlci5nZXRVc2VySW5mbygpO1xyXG4gICAgICAgICAgICBpZiAoIXVzZXJJbmZvKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdVc2VyIG5vdCBhdXRoZW50aWNhdGVkJyB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZW1haWwgPSB1c2VySW5mby5lbWFpbDtcclxuICAgICAgICAgICAgY29uc3QgYWNjb3VudElkID0gdXNlckluZm8uaWQ7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWVtYWlsIHx8ICFhY2NvdW50SWQpIHtcclxuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0NvdWxkIG5vdCBnZXQgdXNlciBpbmZvcm1hdGlvbicgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGF1dGhlbnRpY2F0aW9uIGhhc2hcclxuICAgICAgICAgICAgY29uc3QgYXV0aEhhc2ggPSBhd2FpdCB0aGlzLmdlbmVyYXRlQXV0aEhhc2goYWNjb3VudElkLCBtZXNzYWdlLmV4dGVuc2lvbklkKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgQXV0aCBkYXRhIHJldHJpZXZlZCBmb3IgaW52b2ljZSBkb3dubG9hZDonLCBlbWFpbCwgJ0lEOicsIGFjY291bnRJZCk7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgYXV0aERhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBhY2NvdW50SWQ6IGFjY291bnRJZCxcclxuICAgICAgICAgICAgICAgICAgICBlbWFpbDogZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0aEhhc2g6IGF1dGhIYXNoLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBtZXNzYWdlLmV4dGVuc2lvbklkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRXJyb3IgaGFuZGxpbmcgaW52b2ljZSBkb3dubG9hZCByZXF1ZXN0OicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCdcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGhhbmRsZUdlbmVyYXRlQXV0aEhhc2gobWVzc2FnZSwgc2VuZFJlc3BvbnNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgeyBhY2NvdW50SWQsIGV4dGVuc2lvbklkIH0gPSBtZXNzYWdlO1xyXG4gICAgICAgICAgICBpZiAoIWFjY291bnRJZCB8fCAhZXh0ZW5zaW9uSWQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBhY2NvdW50SWQgb3IgZXh0ZW5zaW9uSWQnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYXV0aEhhc2ggPSBhd2FpdCB0aGlzLmdlbmVyYXRlQXV0aEhhc2goYWNjb3VudElkLCBleHRlbnNpb25JZCk7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGF1dGhIYXNoIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gZ2VuZXJhdGUgYXV0aCBoYXNoOicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBnZW5lcmF0ZUF1dGhIYXNoKGFjY291bnRJZCwgZXh0ZW5zaW9uSWQpIHtcclxuICAgICAgICAvLyBHZW5lcmF0ZSBTSEEtMSBoYXNoIG9mIGV4dGVuc2lvbl9pZCArIGFjY291bnRfaWRcclxuICAgICAgICBjb25zdCBkYXRhID0gZXh0ZW5zaW9uSWQgKyBhY2NvdW50SWQ7XHJcbiAgICAgICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG4gICAgICAgIGNvbnN0IGRhdGFCdWZmZXIgPSBlbmNvZGVyLmVuY29kZShkYXRhKTtcclxuICAgICAgICBjb25zdCBoYXNoQnVmZmVyID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoJ1NIQS0xJywgZGF0YUJ1ZmZlcik7XHJcbiAgICAgICAgY29uc3QgaGFzaEFycmF5ID0gQXJyYXkuZnJvbShuZXcgVWludDhBcnJheShoYXNoQnVmZmVyKSk7XHJcbiAgICAgICAgY29uc3QgaGFzaEhleCA9IGhhc2hBcnJheS5tYXAoYiA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKS5qb2luKCcnKTtcclxuICAgICAgICByZXR1cm4gaGFzaEhleDtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBsb2dBbmFseXNpc1Jlc3VsdChyZXN1bHRzKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFN0b3JlIGxhdGVzdCByZXN1bHRzXHJcbiAgICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XHJcbiAgICAgICAgICAgICAgICBhbmFseXNpc1Jlc3VsdHM6IHJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHRpbWVzdGFtcFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBbmFseXNpcyByZXN1bHQgbG9nZ2VkOicsIHtcclxuICAgICAgICAgICAgICAgIHRvdGFsSW1hZ2VzOiByZXN1bHRzLnRvdGFsX2ltYWdlcyxcclxuICAgICAgICAgICAgICAgIHNpbWlsYXJHcm91cHM6IHJlc3VsdHMuc2ltaWxhcl9ncm91cHMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSh0aW1lc3RhbXApLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvZ2dpbmcgYW5hbHlzaXMgcmVzdWx0OicsIGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgaGFuZGxlUGhvdG9DYXB0dXJlKHJlcXVlc3QsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0JhY2tncm91bmQ6IENhcHR1cmluZyB0ZW1wIGltYWdlIHNjcmVlbnNob3QgZm9yOicsIHJlcXVlc3QucGhvdG9JZCk7XHJcblxyXG4gICAgICAgICAgICAvLyBTdGVwIDE6IEdldCBlbGVtZW50IHBvc2l0aW9uIGlmIGVsZW1lbnRJZCBpcyBwcm92aWRlZFxyXG4gICAgICAgICAgICBsZXQgZWxlbWVudEluZm8gPSBudWxsO1xyXG4gICAgICAgICAgICBpZiAocmVxdWVzdC5lbGVtZW50SWQpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRUZW1wRWxlbWVudEluZm8ocmVxdWVzdC5lbGVtZW50SWQsIHNlbmRlci50YWIuaWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFlbGVtZW50SW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0NvdWxkIG5vdCBsb2NhdGUgdGVtcCBlbGVtZW50JyB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFN0ZXAgMjogQ2FwdHVyZSB0aGUgdmlzaWJsZSB0YWJcclxuICAgICAgICAgICAgY29uc3Qgc2NyZWVuc2hvdCA9IGF3YWl0IGNocm9tZS50YWJzLmNhcHR1cmVWaXNpYmxlVGFiKHNlbmRlci50YWIud2luZG93SWQsIHtcclxuICAgICAgICAgICAgICAgIGZvcm1hdDogJ2pwZWcnLFxyXG4gICAgICAgICAgICAgICAgcXVhbGl0eTogODVcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBTdGVwIDM6IENyb3AgdGhlIHNjcmVlbnNob3QgdG8ganVzdCB0aGUgZWxlbWVudCBhcmVhIChpZiBlbGVtZW50SW5mbyBwcm92aWRlZClcclxuICAgICAgICAgICAgbGV0IGZpbmFsSW1hZ2UgPSBzY3JlZW5zaG90O1xyXG4gICAgICAgICAgICBpZiAoZWxlbWVudEluZm8pIHtcclxuICAgICAgICAgICAgICAgIGZpbmFsSW1hZ2UgPSBhd2FpdCB0aGlzLmNyb3BJbWFnZVRvRWxlbWVudChzY3JlZW5zaG90LCBlbGVtZW50SW5mbyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhOiBmaW5hbEltYWdlLFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6IGVsZW1lbnRJbmZvID8gZWxlbWVudEluZm8ud2lkdGggOiAxMDI0LFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBlbGVtZW50SW5mbyA/IGVsZW1lbnRJbmZvLmhlaWdodCA6IDc2OCxcclxuICAgICAgICAgICAgICAgIHBob3RvSWQ6IHJlcXVlc3QucGhvdG9JZFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignQmFja2dyb3VuZDogU2NyZWVuc2hvdCBjYXB0dXJlIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZ2V0VGVtcEVsZW1lbnRJbmZvKGVsZW1lbnRJZCwgdGFiSWQpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2dldFRlbXBFbGVtZW50SW5mbycsXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50SWQ6IGVsZW1lbnRJZFxyXG4gICAgICAgICAgICB9LCAocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBjcm9wSW1hZ2VUb0VsZW1lbnQoc2NyZWVuc2hvdERhdGFVcmwsIGVsZW1lbnRJbmZvKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gQ29udmVydCBkYXRhIFVSTCB0byBibG9iIGZpcnN0XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc2NyZWVuc2hvdERhdGFVcmwpO1xyXG4gICAgICAgICAgICBjb25zdCBibG9iID0gYXdhaXQgcmVzcG9uc2UuYmxvYigpO1xyXG5cclxuICAgICAgICAgICAgLy8gVXNlIGNyZWF0ZUltYWdlQml0bWFwIGluc3RlYWQgb2YgbmV3IEltYWdlKCkgKHdvcmtzIGluIHNlcnZpY2Ugd29ya2VycylcclxuICAgICAgICAgICAgY29uc3QgaW1hZ2VCaXRtYXAgPSBhd2FpdCBjcmVhdGVJbWFnZUJpdG1hcChibG9iKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENyZWF0ZSBjYW52YXMgZm9yIGNyb3BwaW5nXHJcbiAgICAgICAgICAgIGNvbnN0IGNhbnZhcyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoZWxlbWVudEluZm8ud2lkdGgsIGVsZW1lbnRJbmZvLmhlaWdodCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ3JvcCB0aGUgc2NyZWVuc2hvdCB0byBqdXN0IHRoZSBwaG90byBlbGVtZW50IGFyZWFcclxuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcclxuICAgICAgICAgICAgICAgIGltYWdlQml0bWFwLFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudEluZm8ueCwgZWxlbWVudEluZm8ueSwgZWxlbWVudEluZm8ud2lkdGgsIGVsZW1lbnRJbmZvLmhlaWdodCwgLy8gU291cmNlIHJlY3RhbmdsZVxyXG4gICAgICAgICAgICAgICAgMCwgMCwgZWxlbWVudEluZm8ud2lkdGgsIGVsZW1lbnRJbmZvLmhlaWdodCAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlc3RpbmF0aW9uIHJlY3RhbmdsZVxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgLy8gQ29udmVydCBiYWNrIHRvIGRhdGEgVVJMXHJcbiAgICAgICAgICAgIGNvbnN0IGNyb3BwZWRCbG9iID0gYXdhaXQgY2FudmFzLmNvbnZlcnRUb0Jsb2IoeyB0eXBlOiAnaW1hZ2UvanBlZycsIHF1YWxpdHk6IDAuODUgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBDb252ZXJ0IGJsb2IgdG8gZGF0YSBVUkxcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkZW5kID0gKCkgPT4gcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5vbmVycm9yID0gcmVqZWN0O1xyXG4gICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoY3JvcHBlZEJsb2IpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JvcHBpbmcgaW1hZ2U6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSGFuZGxlIGF1dGhlbnRpY2F0aW9uIGZyb20gZXh0ZW5zaW9uIHBhZ2VcclxuICAgIGFzeW5jIGhhbmRsZUF1dGhlbnRpY2F0ZShtZXNzYWdlLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UkCBTdGFydGluZyBhdXRoZW50aWNhdGlvbiBmbG93IGZyb20gZXh0ZW5zaW9uIHBhZ2UuLi4nKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5vYXV0aEhlbHBlci5zdGFydEF1dGhGbG93KCk7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gc3RhcnQgYXV0aGVudGljYXRpb24gZmxvdzonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSGFuZGxlIE9BdXRoIGZsb3cgaW5pdGlhdGlvblxyXG4gICAgYXN5bmMgaGFuZGxlU3RhcnRPQXV0aChtZXNzYWdlLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UkCBTdGFydGluZyBPQXV0aCBmbG93IGZyb20gYmFja2dyb3VuZC4uLicpO1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLm9hdXRoSGVscGVyLnN0YXJ0QXV0aEZsb3coKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBzdGFydCBPQXV0aCBmbG93OicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBIYW5kbGUgT0F1dGggc3VjY2VzcyBmcm9tIEFQSSB3b3JrZXJcclxuICAgIGFzeW5jIGhhbmRsZU9BdXRoU3VjY2VzcyhtZXNzYWdlLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBIYW5kbGluZyBPQXV0aCBzdWNjZXNzIGluIGJhY2tncm91bmQuLi4nKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5vYXV0aEhlbHBlci5oYW5kbGVPQXV0aFN1Y2Nlc3MobWVzc2FnZS51c2VySW5mbyk7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBPQXV0aCBzdWNjZXNzIGhhbmRsaW5nIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IHVzZXIgaW5mb1xyXG4gICAgYXN5bmMgaGFuZGxlR2V0VXNlckluZm8obWVzc2FnZSwgc2VuZFJlc3BvbnNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdXNlckluZm8gPSBhd2FpdCB0aGlzLm9hdXRoSGVscGVyLmdldFVzZXJJbmZvKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzQXV0aGVudGljYXRlZCA9IGF3YWl0IHRoaXMub2F1dGhIZWxwZXIuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdXNlckluZm86IHVzZXJJbmZvLFxyXG4gICAgICAgICAgICAgICAgaXNBdXRoZW50aWNhdGVkOiBpc0F1dGhlbnRpY2F0ZWRcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBnZXQgdXNlciBpbmZvOicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBIYW5kbGUgc2lnbiBvdXRcclxuICAgIGFzeW5jIGhhbmRsZVNpZ25PdXQobWVzc2FnZSwgc2VuZFJlc3BvbnNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfmqogU2lnbmluZyBvdXQgdXNlci4uLicpO1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLm9hdXRoSGVscGVyLnNpZ25PdXQoKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFNpZ24gb3V0IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmVyaWZ5IE9BdXRoIHNpZ25hdHVyZSBhbmQgc3RvcmUgdXNlciBkYXRhXHJcbiAgICBhc3luYyBoYW5kbGVWZXJpZnlPQXV0aFNpZ25hdHVyZShtZXNzYWdlLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UkCBWZXJpZnlpbmcgT0F1dGggc2lnbmF0dXJlLi4uJyk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCB7IGVtYWlsLCBpZCwgdGltZXN0YW1wLCBzaWduYXR1cmUgfSA9IG1lc3NhZ2U7XHJcblxyXG4gICAgICAgICAgICAvLyBWZXJpZnkgc2lnbmF0dXJlIHVzaW5nIHRoZSBzYW1lIG1ldGhvZCBhcyB0aGUgc2VydmVyXHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGFUb1NpZ24gPSBgJHtlbWFpbH06JHtpZH06JHt0aW1lc3RhbXB9YDtcclxuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRTaWduYXR1cmUgPSBhd2FpdCB0aGlzLmdlbmVyYXRlU2lnbmF0dXJlKGRhdGFUb1NpZ24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHNpZ25hdHVyZSAhPT0gZXhwZWN0ZWRTaWduYXR1cmUpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzaWduYXR1cmUgLSBhdXRoZW50aWNhdGlvbiBkYXRhIG1heSBoYXZlIGJlZW4gdGFtcGVyZWQgd2l0aCcpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTdG9yZSB1c2VyIGluZm8gaWYgc2lnbmF0dXJlIGlzIHZhbGlkXHJcbiAgICAgICAgICAgIGNvbnN0IHVzZXJJbmZvID0geyBlbWFpbCwgaWQgfTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5vYXV0aEhlbHBlci5oYW5kbGVPQXV0aFN1Y2Nlc3ModXNlckluZm8pO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBPQXV0aCBzaWduYXR1cmUgdmVyaWZpZWQgYW5kIHVzZXIgZGF0YSBzdG9yZWQnKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdCk7XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBPQXV0aCBzaWduYXR1cmUgdmVyaWZpY2F0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgc2lnbmF0dXJlIHVzaW5nIHRoZSBzYW1lIG1ldGhvZCBhcyB0aGUgc2VydmVyXHJcbiAgICBhc3luYyBnZW5lcmF0ZVNpZ25hdHVyZShkYXRhKSB7XHJcbiAgICAgICAgLy8gVXNlIGV4dGVuc2lvbiBJRCArIGNsaWVudCBJRCBhcyBzaGFyZWQgc2VjcmV0XHJcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIG9ubHkgb3VyIGV4dGVuc2lvbiBjYW4gdmVyaWZ5IHRoZSBzaWduYXR1cmVcclxuICAgICAgICBjb25zdCBzZWNyZXQgPSBgJHtjaHJvbWUucnVudGltZS5pZH06MzMzMjAwMTg2MDY1LXNlZG11cGsyZ2g4dmt2ZTRjODY3M3N1MDR2aHFmbmMwLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tYDtcclxuXHJcbiAgICAgICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG4gICAgICAgIGNvbnN0IGtleURhdGEgPSBlbmNvZGVyLmVuY29kZShzZWNyZXQpO1xyXG4gICAgICAgIGNvbnN0IG1lc3NhZ2VEYXRhID0gZW5jb2Rlci5lbmNvZGUoZGF0YSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNyeXB0b0tleSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuaW1wb3J0S2V5KFxyXG4gICAgICAgICAgICAncmF3JyxcclxuICAgICAgICAgICAga2V5RGF0YSxcclxuICAgICAgICAgICAgeyBuYW1lOiAnSE1BQycsIGhhc2g6ICdTSEEtMjU2JyB9LFxyXG4gICAgICAgICAgICBmYWxzZSxcclxuICAgICAgICAgICAgWydzaWduJ11cclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSBhd2FpdCBjcnlwdG8uc3VidGxlLnNpZ24oJ0hNQUMnLCBjcnlwdG9LZXksIG1lc3NhZ2VEYXRhKTtcclxuICAgICAgICBjb25zdCBoYXNoQXJyYXkgPSBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KHNpZ25hdHVyZSkpO1xyXG4gICAgICAgIHJldHVybiBoYXNoQXJyYXkubWFwKGIgPT4gYi50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSkuam9pbignJyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIEluaXRpYWxpemUgdGhlIGJhY2tncm91bmQgc2VydmljZVxyXG5uZXcgQmFja2dyb3VuZFNlcnZpY2UoKTsgIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9