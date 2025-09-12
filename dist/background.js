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

console.log('✅ oauth-helper.js loaded');
class OAuthHelper {
    
    constructor() {
        this.apiBaseUrl = 'https://api.gpdrm.com';
        this.pollInterval = 1000; // Poll every second
        this.maxPollAttempts = 300; // 5 minutes max
    }

    // Start OAuth flow with polling approach
    async launchAuthFlow() {
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
            const result = await this.waitForAuthResult(sessionId);

            if (result.success) {
                console.log('✅ OAuth completed successfully');
                return await this.handleAuthSuccess(result.userInfo);
            } else {
                throw new Error(result.error || 'OAuth failed');
            }

        } catch (error) {
            console.error('❌ OAuth flow failed:', error);
            throw error;
        }
    }

    // Poll worker for OAuth results
    async waitForAuthResult(sessionId) {
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
    async handleAuthSuccess(userInfo) {
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
    async fetchUserProfile() {
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
        const userInfo = await this.fetchUserProfile();
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

 

// const DEBUG_ENABLED = false;

// Store original console methods
// const originalConsole = {
//     log: console.log,
//     warn: console.warn,
//     error: console.error,
//     info: console.info,
//     debug: console.debug
// };

// Override console methods based on debug flag
// if (!DEBUG_ENABLED) {
//     console.log = function () { };
//     console.info = function () { };
//     console.debug = function () { };
//     // Keep console.warn and console.error for important messages
// }

class BackgroundService {
    constructor() {
        this.oauthHelper = new _oauth_helper_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
        this.init();
    }

    init() {
        this.initEventHooks();
    }

    initEventHooks() {
        chrome.action.onClicked.addListener(async (tab) => {
            const newTab = await chrome.tabs.create({
                url: chrome.runtime.getURL('html/extension-page.html'),
                active: true
            });

            if (newTab && newTab.windowId) {
                await chrome.windows.update(newTab.windowId, { focused: true });
            }
        });

        chrome.runtime.onInstalled.addListener((details) => {
            this.onExtensionInstall(details);
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.onTabStatusChange(tabId, changeInfo, tab);
        });

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.onInternalMessage(message, sender, sendResponse);
            return true; 
        });

        chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
            this.onExternalMessage(message, sender, sendResponse);
            return true; 
        });
    }

    onExtensionInstall(details) {
        if (details.reason === 'install') {

            chrome.storage.local.set({
                serverUrl: 'http://localhost:8095',
                similarityThreshold: 85,
                installDate: Date.now()
            });

            chrome.tabs.create({
                url: 'https://photos.google.com'
            });
        }
    }

    onTabStatusChange(tabId, changeInfo, tab) {
        if (changeInfo.status !== 'complete') return;

        if (tab.url && tab.url.includes('photos.google.com')) {
            this.setIconForPhotos(tabId, tab.url);
        } else {
            this.resetDefaultIcon(tabId);
        }
    }

    setIconForPhotos(tabId, url) {
        chrome.action.setBadgeText({
            tabId: tabId,
            text: '●'
        });

        chrome.action.setBadgeBackgroundColor({
            tabId: tabId,
            color: '#4285f4'
        });

        const isSearchPage = url.includes('/search/') || url.match(/\/u\/\d+\/search\//);
        if (isSearchPage) {
            chrome.action.setTitle({
                tabId: tabId,
                title: 'Dupeyak Duplicate Remover - Search page detected!'
            });
        } else {
            chrome.action.setTitle({
                tabId: tabId,
                title: 'Dupeyak Duplicate Remover - Navigate to search to find duplicates'
            });
        }
    }

    resetDefaultIcon(tabId) {
        chrome.action.setBadgeText({
            tabId: tabId,
            text: ''
        });

        chrome.action.setTitle({
            tabId: tabId,
            title: 'Dupeyak Duplicate Remover - Go to Google Photos to start'
        });
    }

    async onInternalMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'logAnalysis':
                    await this.recordAnalysisResult(message.results);
                    sendResponse({ success: true });
                    break;

                case 'capturePhoto':
                    await this.onCapturePhoto(message, sender, sendResponse);
                    break;

                case 'openPopup':
                    await this.launchExtensionPopup();
                    sendResponse({ success: true });
                    break;

                case 'downloadInvoice':
                    await this.onDownloadInvoice(message, sendResponse);
                    break;

                case 'startOAuth':
                    await this.onStartOAuth(message, sendResponse);
                    break;

                case 'handleAuthSuccess':
                    await this.handleAuthSuccess(message, sendResponse);
                    break;

                case 'fetchUserProfile':
                    await this.onFetchUserInfo(message, sendResponse);
                    break;

                case 'signOut':
                    await this.onUserSignOut(message, sendResponse);
                    break;

                case 'verifyOAuthSignature':
                    await this.onVerifySignature(message, sendResponse);
                    break;

                case 'authenticate':
                    await this.onAuthenticate(message, sendResponse);
                    break;

                case 'createAuthHash':
                    await this.onCreateAuthHash(message, sendResponse);
                    break;

                case 'openExtensionPage':
                    await this.openExtensionTab(message, sendResponse);
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async onExternalMessage(message, sender, sendResponse) {
        try {

            switch (message.action) {
                case 'oauthSuccess':
                    await this.handleAuthSuccess(message, sendResponse);
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

    async launchExtensionPopup() {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (activeTab) {
                await chrome.action.openPopup();
            } else {
                throw new Error('No active tab found');
            }
        } catch (error) {
            console.warn('⚠️ Could not open popup:', error);
            throw error;
        }
    }

    async openExtensionTab(message, sendResponse) {
        try {
            const tab = await chrome.tabs.create({
                url: chrome.runtime.getURL('/html/extension-page.html'),
                active: true 
            });

            if (tab && tab.id && tab.windowId) {
                await chrome.windows.update(tab.windowId, { focused: true });
                sendResponse({ success: true, tabId: tab.id });
            } else {
                throw new Error('Failed to create tab');
            }
        } catch (error) {
            console.error('❌ Failed to open extension page:', error);
            sendResponse({ success: false, error: error.message });
        }
    }



    async onDownloadInvoice(message, sendResponse) {
        try {
            const userInfo = await this.oauthHelper.fetchUserProfile();
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

            const authHash = await this.createAuthHash(accountId, message.extensionId);

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

    async onCreateAuthHash(message, sendResponse) {
        try {
            const { accountId, extensionId } = message;
            if (!accountId || !extensionId) {
                throw new Error('Missing accountId or extensionId');
            }

            const authHash = await this.createAuthHash(accountId, extensionId);
            sendResponse({ success: true, authHash });
        } catch (error) {
            console.error('❌ Failed to generate auth hash:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async createAuthHash(accountId, extensionId) {
        const data = extensionId + accountId;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async recordAnalysisResult(results) {
        try {
            const timestamp = Date.now();

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

    async onCapturePhoto(request, sender, sendResponse) {
        try {
            let elementInfo = null;
            if (request.elementId) {
                elementInfo = await this.fetchTempElementData(request.elementId, sender.tab.id);
                if (!elementInfo) {
                    sendResponse({ success: false, error: 'Could not locate temp element' });
                    return;
                }
            }
            const screenshot = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
                format: 'jpeg',
                quality: 85
            });
            let finalImage = screenshot;
            if (elementInfo) {
                finalImage = await this.cropImageToTarget(screenshot, elementInfo);
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

    async fetchTempElementData(elementId, tabId) {
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, {
                action: 'fetchTempElementData',
                elementId: elementId
            }, (response) => {
                resolve(response);
            });
        });
    }

    async cropImageToTarget(screenshotDataUrl, elementInfo) {
        try {
            const response = await fetch(screenshotDataUrl);
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);
            const canvas = new OffscreenCanvas(elementInfo.width, elementInfo.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                imageBitmap,
                elementInfo.x, elementInfo.y, elementInfo.width, elementInfo.height, 
                0, 0, elementInfo.width, elementInfo.height                        
            );
            const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });

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

    async onAuthenticate(message, sendResponse) {
        try {
            const result = await this.oauthHelper.launchAuthFlow();
            sendResponse(result);
        } catch (error) {
            console.error('Failed to start authentication flow:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async onStartOAuth(message, sendResponse) {
        try {
            const result = await this.oauthHelper.launchAuthFlow();
            sendResponse(result);
        } catch (error) {
            console.error('❌ Failed to start OAuth flow:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleAuthSuccess(message, sendResponse) {
        try {
            const result = await this.oauthHelper.handleAuthSuccess(message.userInfo);
            sendResponse(result);
        } catch (error) {
            console.error('❌ OAuth success handling failed:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async onFetchUserInfo(message, sendResponse) {
        try {
            const userInfo = await this.oauthHelper.fetchUserProfile();
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

    async onUserSignOut(message, sendResponse) {
        try {
            const result = await this.oauthHelper.signOut();
            sendResponse(result);
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async onVerifySignature(message, sendResponse) {
        try {

            const { email, id, timestamp, signature } = message;
            const dataToSign = `${email}:${id}:${timestamp}`;
            const expectedSignature = await this.createSignature(dataToSign);

            if (signature !== expectedSignature) {
                throw new Error('Invalid signature - authentication data may have been tampered with');
            }
            const userInfo = { email, id };
            const result = await this.oauthHelper.handleAuthSuccess(userInfo);
            sendResponse(result);

        } catch (error) {
            console.error('❌ OAuth signature verification failed:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    async createSignature(data) {
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
new BackgroundService(); 
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsK0RBQStELGVBQWU7QUFDOUU7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1DQUFtQyxlQUFlO0FBQ2xEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUMsZUFBZTtBQUNsRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUMseUNBQXlDO0FBQzVFO0FBQ0EsVUFBVTtBQUNWO0FB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O0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixrQ0FBa0M7QUFDdEQsa0NBQWtDLE1BQU0sR0FBRyxHQUFHLEdBQUcsVUFBVTtBQUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCO0FBQy9CO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBLDJCQUEyQixzQ0FBc0M7QUFDakU7QUFDQTtBQUNBO0FBQ0EsMEJBQTBCLGtCQUFrQjtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYywrQkFBK0I7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9sYXRlc3QvLi9zcmMvanMvb2F1dGgtaGVscGVyLmpzIiwid2VicGFjazovL2xhdGVzdC93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9sYXRlc3Qvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL2xhdGVzdC93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL2xhdGVzdC93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL2xhdGVzdC8uL3NyYy9qcy9iYWNrZ3JvdW5kLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIlxyXG5jb25zb2xlLmxvZygn4pyFIG9hdXRoLWhlbHBlci5qcyBsb2FkZWQnKTtcclxuY2xhc3MgT0F1dGhIZWxwZXIge1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmFwaUJhc2VVcmwgPSAnaHR0cHM6Ly9hcGkuZ3Bkcm0uY29tJztcclxuICAgICAgICB0aGlzLnBvbGxJbnRlcnZhbCA9IDEwMDA7IC8vIFBvbGwgZXZlcnkgc2Vjb25kXHJcbiAgICAgICAgdGhpcy5tYXhQb2xsQXR0ZW1wdHMgPSAzMDA7IC8vIDUgbWludXRlcyBtYXhcclxuICAgIH1cclxuXHJcbiAgICAvLyBTdGFydCBPQXV0aCBmbG93IHdpdGggcG9sbGluZyBhcHByb2FjaFxyXG4gICAgYXN5bmMgbGF1bmNoQXV0aEZsb3coKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJAgU3RhcnRpbmcgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2guLi4nKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogUmVxdWVzdCB3b3JrZXIgdG8gY3JlYXRlIE9BdXRoIHNlc3Npb25cclxuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvblJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5hcGlCYXNlVXJsfS9vYXV0aC9jcmVhdGUtc2Vzc2lvbmAsIHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXNlc3Npb25SZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIE9BdXRoIHNlc3Npb24nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgeyBzZXNzaW9uSWQsIGF1dGhVcmwgfSA9IGF3YWl0IHNlc3Npb25SZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OdIE9BdXRoIHNlc3Npb24gY3JlYXRlZDonLCBzZXNzaW9uSWQpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAyOiBPcGVuIGF1dGggVVJMIGluIG5ldyB0YWJcclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBhdXRoVXJsIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAzOiBTdGFydCBwb2xsaW5nIGZvciByZXN1bHRzXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMud2FpdEZvckF1dGhSZXN1bHQoc2Vzc2lvbklkKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBPQXV0aCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVBdXRoU3VjY2VzcyhyZXN1bHQudXNlckluZm8pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCAnT0F1dGggZmFpbGVkJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIE9BdXRoIGZsb3cgZmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFBvbGwgd29ya2VyIGZvciBPQXV0aCByZXN1bHRzXHJcbiAgICBhc3luYyB3YWl0Rm9yQXV0aFJlc3VsdChzZXNzaW9uSWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBTdGFydGluZyB0byBwb2xsIGZvciBPQXV0aCByZXN1bHRzLi4uJyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgdGhpcy5tYXhQb2xsQXR0ZW1wdHM7IGF0dGVtcHQrKykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHt0aGlzLmFwaUJhc2VVcmx9L29hdXRoL2NoZWNrLXNlc3Npb25gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uSWQ6IHNlc3Npb25JZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uSWQ6IGNocm9tZS5ydW50aW1lLmlkXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1BvbGwgcmVxdWVzdCBmYWlsZWQsIHJldHJ5aW5nLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCh0aGlzLnBvbGxJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnY29tcGxldGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46JIE9BdXRoIGNvbXBsZXRlZCEnKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VySW5mbzogcmVzdWx0LnVzZXJJbmZvXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LnN0YXR1cyA9PT0gJ2Vycm9yJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogcmVzdWx0LmVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LnN0YXR1cyA9PT0gJ3BlbmRpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RpbGwgd2FpdGluZywgY29udGludWUgcG9sbGluZ1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDij7MgUG9sbGluZyBhdHRlbXB0ICR7YXR0ZW1wdCArIDF9LyR7dGhpcy5tYXhQb2xsQXR0ZW1wdHN9Li4uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCh0aGlzLnBvbGxJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBzZXNzaW9uIHN0YXR1czogJyArIHJlc3VsdC5zdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignUG9sbCBhdHRlbXB0IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKHRoaXMucG9sbEludGVydmFsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUG9sbGluZyB0aW1lZCBvdXRcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgZXJyb3I6ICdPQXV0aCB0aW1lb3V0IC0gcGxlYXNlIHRyeSBhZ2FpbidcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEhhbmRsZSBzdWNjZXNzZnVsIE9BdXRoXHJcbiAgICBhc3luYyBoYW5kbGVBdXRoU3VjY2Vzcyh1c2VySW5mbykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIFByb2Nlc3NpbmcgT0F1dGggc3VjY2Vzcy4uLicpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RvcmUgdXNlciBpbmZvIGluIGV4dGVuc2lvbiBzdG9yYWdlXHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJFbWFpbDogdXNlckluZm8uZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgdXNlcklkOiB1c2VySW5mby5pZCxcclxuICAgICAgICAgICAgICAgICAgICBhdXRoVGltZXN0YW1wOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9LCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIFVzZXIgaW5mbyBzdG9yZWQ6JywgdXNlckluZm8uZW1haWwpO1xyXG5cclxuICAgICAgICAgICAgLy8gTm90aWZ5IGV4dGVuc2lvbiBwYWdlIGlmIGl0J3Mgb3BlblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2F1dGhlbnRpY2F0aW9uQ29tcGxldGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJJbmZvOiB1c2VySW5mb1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBwYWdlIG1pZ2h0IG5vdCBiZSBvcGVuLCB0aGF0J3Mgb2tcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB1c2VySW5mbzogdXNlckluZm9cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBoYW5kbGUgT0F1dGggc3VjY2VzczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgc3RvcmVkIHVzZXIgaW5mb1xyXG4gICAgYXN5bmMgZmV0Y2hVc2VyUHJvZmlsZSgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsndXNlckVtYWlsJywgJ3VzZXJJZCcsICdhdXRoVGltZXN0YW1wJ10sIChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudXNlckVtYWlsICYmIHJlc3VsdC51c2VySWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW1haWw6IHJlc3VsdC51c2VyRW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHJlc3VsdC5hdXRoVGltZXN0YW1wXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHVzZXIgaXMgYXV0aGVudGljYXRlZFxyXG4gICAgYXN5bmMgaXNBdXRoZW50aWNhdGVkKCkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgdGhpcy5mZXRjaFVzZXJQcm9maWxlKCk7XHJcbiAgICAgICAgcmV0dXJuIHVzZXJJbmZvICE9PSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNpZ24gb3V0IHVzZXJcclxuICAgIGFzeW5jIHNpZ25PdXQoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfmqogU2lnbmluZyBvdXQgdXNlci4uLicpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ2xlYXIgc3RvcmVkIHVzZXIgZGF0YVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKFsndXNlckVtYWlsJywgJ3VzZXJJZCcsICdhdXRoVGltZXN0YW1wJ10sIHJlc29sdmUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgVXNlciBzaWduZWQgb3V0IHN1Y2Nlc3NmdWxseScpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFNpZ24gb3V0IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBVdGlsaXR5IGZ1bmN0aW9uIHRvIHNsZWVwXHJcbiAgICBzbGVlcChtcykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgc2NyaXB0c1xyXG4vLyBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gT0F1dGhIZWxwZXI7XHJcbi8vIH0gXHJcblxyXG5leHBvcnQgZGVmYXVsdCBPQXV0aEhlbHBlcjtcclxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJcclxuaW1wb3J0IE9BdXRoSGVscGVyIGZyb20gJy4vb2F1dGgtaGVscGVyLmpzJzsgXHJcblxyXG4vLyBjb25zdCBERUJVR19FTkFCTEVEID0gZmFsc2U7XHJcblxyXG4vLyBTdG9yZSBvcmlnaW5hbCBjb25zb2xlIG1ldGhvZHNcclxuLy8gY29uc3Qgb3JpZ2luYWxDb25zb2xlID0ge1xyXG4vLyAgICAgbG9nOiBjb25zb2xlLmxvZyxcclxuLy8gICAgIHdhcm46IGNvbnNvbGUud2FybixcclxuLy8gICAgIGVycm9yOiBjb25zb2xlLmVycm9yLFxyXG4vLyAgICAgaW5mbzogY29uc29sZS5pbmZvLFxyXG4vLyAgICAgZGVidWc6IGNvbnNvbGUuZGVidWdcclxuLy8gfTtcclxuXHJcbi8vIE92ZXJyaWRlIGNvbnNvbGUgbWV0aG9kcyBiYXNlZCBvbiBkZWJ1ZyBmbGFnXHJcbi8vIGlmICghREVCVUdfRU5BQkxFRCkge1xyXG4vLyAgICAgY29uc29sZS5sb2cgPSBmdW5jdGlvbiAoKSB7IH07XHJcbi8vICAgICBjb25zb2xlLmluZm8gPSBmdW5jdGlvbiAoKSB7IH07XHJcbi8vICAgICBjb25zb2xlLmRlYnVnID0gZnVuY3Rpb24gKCkgeyB9O1xyXG4vLyAgICAgLy8gS2VlcCBjb25zb2xlLndhcm4gYW5kIGNvbnNvbGUuZXJyb3IgZm9yIGltcG9ydGFudCBtZXNzYWdlc1xyXG4vLyB9XHJcblxyXG5jbGFzcyBCYWNrZ3JvdW5kU2VydmljZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLm9hdXRoSGVscGVyID0gbmV3IE9BdXRoSGVscGVyKCk7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdCgpIHtcclxuICAgICAgICB0aGlzLmluaXRFdmVudEhvb2tzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdEV2ZW50SG9va3MoKSB7XHJcbiAgICAgICAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHRhYikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBuZXdUYWIgPSBhd2FpdCBjaHJvbWUudGFicy5jcmVhdGUoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoJ2h0bWwvZXh0ZW5zaW9uLXBhZ2UuaHRtbCcpLFxyXG4gICAgICAgICAgICAgICAgYWN0aXZlOiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5ld1RhYiAmJiBuZXdUYWIud2luZG93SWQpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGNocm9tZS53aW5kb3dzLnVwZGF0ZShuZXdUYWIud2luZG93SWQsIHsgZm9jdXNlZDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoZGV0YWlscykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm9uRXh0ZW5zaW9uSW5zdGFsbChkZXRhaWxzKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2hyb21lLnRhYnMub25VcGRhdGVkLmFkZExpc3RlbmVyKCh0YWJJZCwgY2hhbmdlSW5mbywgdGFiKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub25UYWJTdGF0dXNDaGFuZ2UodGFiSWQsIGNoYW5nZUluZm8sIHRhYik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5vbkludGVybmFsTWVzc2FnZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlOyBcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlRXh0ZXJuYWwuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub25FeHRlcm5hbE1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgb25FeHRlbnNpb25JbnN0YWxsKGRldGFpbHMpIHtcclxuICAgICAgICBpZiAoZGV0YWlscy5yZWFzb24gPT09ICdpbnN0YWxsJykge1xyXG5cclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHtcclxuICAgICAgICAgICAgICAgIHNlcnZlclVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5NScsXHJcbiAgICAgICAgICAgICAgICBzaW1pbGFyaXR5VGhyZXNob2xkOiA4NSxcclxuICAgICAgICAgICAgICAgIGluc3RhbGxEYXRlOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2h0dHBzOi8vcGhvdG9zLmdvb2dsZS5jb20nXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvblRhYlN0YXR1c0NoYW5nZSh0YWJJZCwgY2hhbmdlSW5mbywgdGFiKSB7XHJcbiAgICAgICAgaWYgKGNoYW5nZUluZm8uc3RhdHVzICE9PSAnY29tcGxldGUnKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmICh0YWIudXJsICYmIHRhYi51cmwuaW5jbHVkZXMoJ3Bob3Rvcy5nb29nbGUuY29tJykpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRJY29uRm9yUGhvdG9zKHRhYklkLCB0YWIudXJsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnJlc2V0RGVmYXVsdEljb24odGFiSWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXRJY29uRm9yUGhvdG9zKHRhYklkLCB1cmwpIHtcclxuICAgICAgICBjaHJvbWUuYWN0aW9uLnNldEJhZGdlVGV4dCh7XHJcbiAgICAgICAgICAgIHRhYklkOiB0YWJJZCxcclxuICAgICAgICAgICAgdGV4dDogJ+KXjydcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2hyb21lLmFjdGlvbi5zZXRCYWRnZUJhY2tncm91bmRDb2xvcih7XHJcbiAgICAgICAgICAgIHRhYklkOiB0YWJJZCxcclxuICAgICAgICAgICAgY29sb3I6ICcjNDI4NWY0J1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBpc1NlYXJjaFBhZ2UgPSB1cmwuaW5jbHVkZXMoJy9zZWFyY2gvJykgfHwgdXJsLm1hdGNoKC9cXC91XFwvXFxkK1xcL3NlYXJjaFxcLy8pO1xyXG4gICAgICAgIGlmIChpc1NlYXJjaFBhZ2UpIHtcclxuICAgICAgICAgICAgY2hyb21lLmFjdGlvbi5zZXRUaXRsZSh7XHJcbiAgICAgICAgICAgICAgICB0YWJJZDogdGFiSWQsXHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0R1cGV5YWsgRHVwbGljYXRlIFJlbW92ZXIgLSBTZWFyY2ggcGFnZSBkZXRlY3RlZCEnXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNocm9tZS5hY3Rpb24uc2V0VGl0bGUoe1xyXG4gICAgICAgICAgICAgICAgdGFiSWQ6IHRhYklkLFxyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdEdXBleWFrIER1cGxpY2F0ZSBSZW1vdmVyIC0gTmF2aWdhdGUgdG8gc2VhcmNoIHRvIGZpbmQgZHVwbGljYXRlcydcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0RGVmYXVsdEljb24odGFiSWQpIHtcclxuICAgICAgICBjaHJvbWUuYWN0aW9uLnNldEJhZGdlVGV4dCh7XHJcbiAgICAgICAgICAgIHRhYklkOiB0YWJJZCxcclxuICAgICAgICAgICAgdGV4dDogJydcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2hyb21lLmFjdGlvbi5zZXRUaXRsZSh7XHJcbiAgICAgICAgICAgIHRhYklkOiB0YWJJZCxcclxuICAgICAgICAgICAgdGl0bGU6ICdEdXBleWFrIER1cGxpY2F0ZSBSZW1vdmVyIC0gR28gdG8gR29vZ2xlIFBob3RvcyB0byBzdGFydCdcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvbkludGVybmFsTWVzc2FnZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS5hY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2xvZ0FuYWx5c2lzJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlY29yZEFuYWx5c2lzUmVzdWx0KG1lc3NhZ2UucmVzdWx0cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlICdjYXB0dXJlUGhvdG8nOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub25DYXB0dXJlUGhvdG8obWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ29wZW5Qb3B1cCc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5sYXVuY2hFeHRlbnNpb25Qb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnZG93bmxvYWRJbnZvaWNlJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm9uRG93bmxvYWRJbnZvaWNlKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnc3RhcnRPQXV0aCc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5vblN0YXJ0T0F1dGgobWVzc2FnZSwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlICdoYW5kbGVBdXRoU3VjY2Vzcyc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVBdXRoU3VjY2VzcyhtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgJ2ZldGNoVXNlclByb2ZpbGUnOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub25GZXRjaFVzZXJJbmZvKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnc2lnbk91dCc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5vblVzZXJTaWduT3V0KG1lc3NhZ2UsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAndmVyaWZ5T0F1dGhTaWduYXR1cmUnOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub25WZXJpZnlTaWduYXR1cmUobWVzc2FnZSwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlICdhdXRoZW50aWNhdGUnOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub25BdXRoZW50aWNhdGUobWVzc2FnZSwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlICdjcmVhdGVBdXRoSGFzaCc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5vbkNyZWF0ZUF1dGhIYXNoKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnb3BlbkV4dGVuc2lvblBhZ2UnOlxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub3BlbkV4dGVuc2lvblRhYihtZXNzYWdlLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVW5rbm93biBhY3Rpb24nIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaGFuZGxpbmcgbWVzc2FnZTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgb25FeHRlcm5hbE1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlLmFjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnb2F1dGhTdWNjZXNzJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZUF1dGhTdWNjZXNzKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnb2F1dGhFcnJvcic6XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIE9BdXRoIGVycm9yIGZyb20gQVBJIHdvcmtlcjonLCBtZXNzYWdlLmVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IG1lc3NhZ2UuZXJyb3IgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdVbmtub3duIGV4dGVybmFsIGFjdGlvbicgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBoYW5kbGluZyBleHRlcm5hbCBtZXNzYWdlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBsYXVuY2hFeHRlbnNpb25Qb3B1cCgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBbYWN0aXZlVGFiXSA9IGF3YWl0IGNocm9tZS50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFjdGl2ZVRhYikge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgY2hyb21lLmFjdGlvbi5vcGVuUG9wdXAoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gYWN0aXZlIHRhYiBmb3VuZCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKCfimqDvuI8gQ291bGQgbm90IG9wZW4gcG9wdXA6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgb3BlbkV4dGVuc2lvblRhYihtZXNzYWdlLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB0YWIgPSBhd2FpdCBjaHJvbWUudGFicy5jcmVhdGUoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoJy9odG1sL2V4dGVuc2lvbi1wYWdlLmh0bWwnKSxcclxuICAgICAgICAgICAgICAgIGFjdGl2ZTogdHJ1ZSBcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGFiICYmIHRhYi5pZCAmJiB0YWIud2luZG93SWQpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGNocm9tZS53aW5kb3dzLnVwZGF0ZSh0YWIud2luZG93SWQsIHsgZm9jdXNlZDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHRhYklkOiB0YWIuaWQgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdGFiJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIG9wZW4gZXh0ZW5zaW9uIHBhZ2U6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgYXN5bmMgb25Eb3dubG9hZEludm9pY2UobWVzc2FnZSwgc2VuZFJlc3BvbnNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdXNlckluZm8gPSBhd2FpdCB0aGlzLm9hdXRoSGVscGVyLmZldGNoVXNlclByb2ZpbGUoKTtcclxuICAgICAgICAgICAgaWYgKCF1c2VySW5mbykge1xyXG4gICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVXNlciBub3QgYXV0aGVudGljYXRlZCcgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGVtYWlsID0gdXNlckluZm8uZW1haWw7XHJcbiAgICAgICAgICAgIGNvbnN0IGFjY291bnRJZCA9IHVzZXJJbmZvLmlkO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFlbWFpbCB8fCAhYWNjb3VudElkKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdDb3VsZCBub3QgZ2V0IHVzZXIgaW5mb3JtYXRpb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhdXRoSGFzaCA9IGF3YWl0IHRoaXMuY3JlYXRlQXV0aEhhc2goYWNjb3VudElkLCBtZXNzYWdlLmV4dGVuc2lvbklkKTtcclxuXHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgYXV0aERhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBhY2NvdW50SWQ6IGFjY291bnRJZCxcclxuICAgICAgICAgICAgICAgICAgICBlbWFpbDogZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0aEhhc2g6IGF1dGhIYXNoLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBtZXNzYWdlLmV4dGVuc2lvbklkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRXJyb3IgaGFuZGxpbmcgaW52b2ljZSBkb3dubG9hZCByZXF1ZXN0OicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCdcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIG9uQ3JlYXRlQXV0aEhhc2gobWVzc2FnZSwgc2VuZFJlc3BvbnNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgeyBhY2NvdW50SWQsIGV4dGVuc2lvbklkIH0gPSBtZXNzYWdlO1xyXG4gICAgICAgICAgICBpZiAoIWFjY291bnRJZCB8fCAhZXh0ZW5zaW9uSWQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBhY2NvdW50SWQgb3IgZXh0ZW5zaW9uSWQnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYXV0aEhhc2ggPSBhd2FpdCB0aGlzLmNyZWF0ZUF1dGhIYXNoKGFjY291bnRJZCwgZXh0ZW5zaW9uSWQpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBhdXRoSGFzaCB9KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIGdlbmVyYXRlIGF1dGggaGFzaDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgY3JlYXRlQXV0aEhhc2goYWNjb3VudElkLCBleHRlbnNpb25JZCkge1xyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBleHRlbnNpb25JZCArIGFjY291bnRJZDtcclxuICAgICAgICBjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XHJcbiAgICAgICAgY29uc3QgZGF0YUJ1ZmZlciA9IGVuY29kZXIuZW5jb2RlKGRhdGEpO1xyXG4gICAgICAgIGNvbnN0IGhhc2hCdWZmZXIgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdCgnU0hBLTEnLCBkYXRhQnVmZmVyKTtcclxuICAgICAgICBjb25zdCBoYXNoQXJyYXkgPSBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGhhc2hCdWZmZXIpKTtcclxuICAgICAgICBjb25zdCBoYXNoSGV4ID0gaGFzaEFycmF5Lm1hcChiID0+IGIudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJykpLmpvaW4oJycpO1xyXG4gICAgICAgIHJldHVybiBoYXNoSGV4O1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHJlY29yZEFuYWx5c2lzUmVzdWx0KHJlc3VsdHMpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHtcclxuICAgICAgICAgICAgICAgIGFuYWx5c2lzUmVzdWx0czogcmVzdWx0cyxcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdGltZXN0YW1wXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0FuYWx5c2lzIHJlc3VsdCBsb2dnZWQ6Jywge1xyXG4gICAgICAgICAgICAgICAgdG90YWxJbWFnZXM6IHJlc3VsdHMudG90YWxfaW1hZ2VzLFxyXG4gICAgICAgICAgICAgICAgc2ltaWxhckdyb3VwczogcmVzdWx0cy5zaW1pbGFyX2dyb3Vwcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKHRpbWVzdGFtcCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9nZ2luZyBhbmFseXNpcyByZXN1bHQ6JywgZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvbkNhcHR1cmVQaG90byhyZXF1ZXN0LCBzZW5kZXIsIHNlbmRSZXNwb25zZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGxldCBlbGVtZW50SW5mbyA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0LmVsZW1lbnRJZCkge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudEluZm8gPSBhd2FpdCB0aGlzLmZldGNoVGVtcEVsZW1lbnREYXRhKHJlcXVlc3QuZWxlbWVudElkLCBzZW5kZXIudGFiLmlkKTtcclxuICAgICAgICAgICAgICAgIGlmICghZWxlbWVudEluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdDb3VsZCBub3QgbG9jYXRlIHRlbXAgZWxlbWVudCcgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHNjcmVlbnNob3QgPSBhd2FpdCBjaHJvbWUudGFicy5jYXB0dXJlVmlzaWJsZVRhYihzZW5kZXIudGFiLndpbmRvd0lkLCB7XHJcbiAgICAgICAgICAgICAgICBmb3JtYXQ6ICdqcGVnJyxcclxuICAgICAgICAgICAgICAgIHF1YWxpdHk6IDg1XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBsZXQgZmluYWxJbWFnZSA9IHNjcmVlbnNob3Q7XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50SW5mbykge1xyXG4gICAgICAgICAgICAgICAgZmluYWxJbWFnZSA9IGF3YWl0IHRoaXMuY3JvcEltYWdlVG9UYXJnZXQoc2NyZWVuc2hvdCwgZWxlbWVudEluZm8pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGltYWdlRGF0YTogZmluYWxJbWFnZSxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiBlbGVtZW50SW5mbyA/IGVsZW1lbnRJbmZvLndpZHRoIDogMTAyNCxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogZWxlbWVudEluZm8gPyBlbGVtZW50SW5mby5oZWlnaHQgOiA3NjgsXHJcbiAgICAgICAgICAgICAgICBwaG90b0lkOiByZXF1ZXN0LnBob3RvSWRcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0JhY2tncm91bmQ6IFNjcmVlbnNob3QgY2FwdHVyZSBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZldGNoVGVtcEVsZW1lbnREYXRhKGVsZW1lbnRJZCwgdGFiSWQpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2ZldGNoVGVtcEVsZW1lbnREYXRhJyxcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRJZDogZWxlbWVudElkXHJcbiAgICAgICAgICAgIH0sIChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGNyb3BJbWFnZVRvVGFyZ2V0KHNjcmVlbnNob3REYXRhVXJsLCBlbGVtZW50SW5mbykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc2NyZWVuc2hvdERhdGFVcmwpO1xyXG4gICAgICAgICAgICBjb25zdCBibG9iID0gYXdhaXQgcmVzcG9uc2UuYmxvYigpO1xyXG4gICAgICAgICAgICBjb25zdCBpbWFnZUJpdG1hcCA9IGF3YWl0IGNyZWF0ZUltYWdlQml0bWFwKGJsb2IpO1xyXG4gICAgICAgICAgICBjb25zdCBjYW52YXMgPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKGVsZW1lbnRJbmZvLndpZHRoLCBlbGVtZW50SW5mby5oZWlnaHQpO1xyXG4gICAgICAgICAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcclxuICAgICAgICAgICAgICAgIGltYWdlQml0bWFwLFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudEluZm8ueCwgZWxlbWVudEluZm8ueSwgZWxlbWVudEluZm8ud2lkdGgsIGVsZW1lbnRJbmZvLmhlaWdodCwgXHJcbiAgICAgICAgICAgICAgICAwLCAwLCBlbGVtZW50SW5mby53aWR0aCwgZWxlbWVudEluZm8uaGVpZ2h0ICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNyb3BwZWRCbG9iID0gYXdhaXQgY2FudmFzLmNvbnZlcnRUb0Jsb2IoeyB0eXBlOiAnaW1hZ2UvanBlZycsIHF1YWxpdHk6IDAuODUgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSAoKSA9PiByZXNvbHZlKHJlYWRlci5yZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgcmVhZGVyLm9uZXJyb3IgPSByZWplY3Q7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTChjcm9wcGVkQmxvYik7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcm9wcGluZyBpbWFnZTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvbkF1dGhlbnRpY2F0ZShtZXNzYWdlLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLm9hdXRoSGVscGVyLmxhdW5jaEF1dGhGbG93KCk7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzdGFydCBhdXRoZW50aWNhdGlvbiBmbG93OicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvblN0YXJ0T0F1dGgobWVzc2FnZSwgc2VuZFJlc3BvbnNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5vYXV0aEhlbHBlci5sYXVuY2hBdXRoRmxvdygpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UocmVzdWx0KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIHN0YXJ0IE9BdXRoIGZsb3c6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGhhbmRsZUF1dGhTdWNjZXNzKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMub2F1dGhIZWxwZXIuaGFuZGxlQXV0aFN1Y2Nlc3MobWVzc2FnZS51c2VySW5mbyk7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXN1bHQpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBPQXV0aCBzdWNjZXNzIGhhbmRsaW5nIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgb25GZXRjaFVzZXJJbmZvKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgdGhpcy5vYXV0aEhlbHBlci5mZXRjaFVzZXJQcm9maWxlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzQXV0aGVudGljYXRlZCA9IGF3YWl0IHRoaXMub2F1dGhIZWxwZXIuaXNBdXRoZW50aWNhdGVkKCk7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdXNlckluZm86IHVzZXJJbmZvLFxyXG4gICAgICAgICAgICAgICAgaXNBdXRoZW50aWNhdGVkOiBpc0F1dGhlbnRpY2F0ZWRcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBnZXQgdXNlciBpbmZvOicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvblVzZXJTaWduT3V0KG1lc3NhZ2UsIHNlbmRSZXNwb25zZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMub2F1dGhIZWxwZXIuc2lnbk91dCgpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UocmVzdWx0KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgU2lnbiBvdXQgZmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvblZlcmlmeVNpZ25hdHVyZShtZXNzYWdlLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG5cclxuICAgICAgICAgICAgY29uc3QgeyBlbWFpbCwgaWQsIHRpbWVzdGFtcCwgc2lnbmF0dXJlIH0gPSBtZXNzYWdlO1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhVG9TaWduID0gYCR7ZW1haWx9OiR7aWR9OiR7dGltZXN0YW1wfWA7XHJcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkU2lnbmF0dXJlID0gYXdhaXQgdGhpcy5jcmVhdGVTaWduYXR1cmUoZGF0YVRvU2lnbik7XHJcblxyXG4gICAgICAgICAgICBpZiAoc2lnbmF0dXJlICE9PSBleHBlY3RlZFNpZ25hdHVyZSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHNpZ25hdHVyZSAtIGF1dGhlbnRpY2F0aW9uIGRhdGEgbWF5IGhhdmUgYmVlbiB0YW1wZXJlZCB3aXRoJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgdXNlckluZm8gPSB7IGVtYWlsLCBpZCB9O1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLm9hdXRoSGVscGVyLmhhbmRsZUF1dGhTdWNjZXNzKHVzZXJJbmZvKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdCk7XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBPQXV0aCBzaWduYXR1cmUgdmVyaWZpY2F0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBhc3luYyBjcmVhdGVTaWduYXR1cmUoZGF0YSkge1xyXG4gICAgICAgIGNvbnN0IHNlY3JldCA9IGAke2Nocm9tZS5ydW50aW1lLmlkfTozMzMyMDAxODYwNjUtc2VkbXVwazJnaDh2a3ZlNGM4Njczc3UwNHZocWZuYzAuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb21gO1xyXG5cclxuICAgICAgICBjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XHJcbiAgICAgICAgY29uc3Qga2V5RGF0YSA9IGVuY29kZXIuZW5jb2RlKHNlY3JldCk7XHJcbiAgICAgICAgY29uc3QgbWVzc2FnZURhdGEgPSBlbmNvZGVyLmVuY29kZShkYXRhKTtcclxuXHJcbiAgICAgICAgY29uc3QgY3J5cHRvS2V5ID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5pbXBvcnRLZXkoXHJcbiAgICAgICAgICAgICdyYXcnLFxyXG4gICAgICAgICAgICBrZXlEYXRhLFxyXG4gICAgICAgICAgICB7IG5hbWU6ICdITUFDJywgaGFzaDogJ1NIQS0yNTYnIH0sXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICAgICBbJ3NpZ24nXVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuc2lnbignSE1BQycsIGNyeXB0b0tleSwgbWVzc2FnZURhdGEpO1xyXG4gICAgICAgIGNvbnN0IGhhc2hBcnJheSA9IEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoc2lnbmF0dXJlKSk7XHJcbiAgICAgICAgcmV0dXJuIGhhc2hBcnJheS5tYXAoYiA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKS5qb2luKCcnKTtcclxuICAgIH1cclxufVxyXG5uZXcgQmFja2dyb3VuZFNlcnZpY2UoKTsgIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9