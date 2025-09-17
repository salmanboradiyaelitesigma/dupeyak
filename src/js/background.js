
import OAuthHelper from './oauth-helper.js'; 

class BackgroundService {
    constructor() {
        this.oauthHelper = new OAuthHelper();
        this.init();
    }

    init() {
        this.initEventHooks();
    }

    initEventHooks() {
        chrome.action.onClicked.addListener(async (tab) => {
            const newTab = await chrome.tabs.create({
                url: chrome.runtime.getURL('html/tool-page.html'),
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
                 url: chrome.runtime.getURL('/html/tool-page.html'),
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