// Google Photos Duplicate Remover - Background Service Worker

// Import OAuth helper
//  importScripts('oauth-helper.js');
import OAuthHelper from './oauth-helper.js'; 


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
        this.oauthHelper = new OAuthHelper();
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