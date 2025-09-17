

const BackgroundService = {
    init() {
        this.initEventHooks();
    },
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
    },

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
    },

    onTabStatusChange(tabId, changeInfo, tab) {
        if (changeInfo.status !== 'complete') return;

        if (tab.url && tab.url.includes('photos.google.com')) {
            this.setIconForPhotos(tabId, tab.url);
        } else {
            this.resetDefaultIcon(tabId);
        }
    },

    setIconForPhotos(tabId, url) {
        chrome.action.setBadgeText({ tabId, text: '●' });
        chrome.action.setBadgeBackgroundColor({ tabId, color: '#4285f4' });

        const isSearchPage = url.includes('/search/') || url.match(/\/u\/\d+\/search\//);
        chrome.action.setTitle({
            tabId,
            title: isSearchPage 
                ? 'Dupeyak Duplicate Remover - Search page detected!' 
                : 'Dupeyak Duplicate Remover - Navigate to search to find duplicates'
        });
    },

    resetDefaultIcon(tabId) {
        chrome.action.setBadgeText({ tabId, text: '' });
        chrome.action.setTitle({
            tabId: tabId,
            title: 'Dupeyak Duplicate Remover - Go to Google Photos to start'
        });
    },

    async onInternalMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'recordAnalysis':
                    await this.recordAnalysisResult(message.results);
                    sendResponse({ success: true });
                    break;

                case 'onCapture':
                    await this.onCapturePhoto(message, sender, sendResponse);
                    break;

                case 'signOut':
                    await this.onUserSignOut(message, sendResponse);
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    },
    async recordAnalysisResult(results) {
          console.log("Background9")
        try {
            const timestamp = Date.now();

            await chrome.storage.local.set({
                analysisResults: results,
                timestamp: timestamp
            });
        } catch (error) {
            console.error('Error logging analysis result:', error);
        }
    },
    async onCapturePhoto(request, sender, sendResponse) {
          console.log("Background10")
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
    },

    async fetchTempElementData(elementId, tabId) {
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, {
                action: 'fetchTempElementData',
                elementId: elementId
            }, (response) => {
                resolve(response);
            });
        });
    },

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
    },
    async  signOut() {
        try {
            await new Promise((resolve) => {
                chrome.storage.local.remove(['userEmail', 'userId', 'authTimestamp'], resolve);
            });

            return { success: true };
        } catch (error) {
            console.error('Sign out failed:', error);
            throw error;
        }
    },
    async onUserSignOut(message, sendResponse) {
        try {
                const result = await this.signOut();
            sendResponse(result);
        } catch (error) {
            console.error('Sign out failed:', error);
            sendResponse({ success: false, error: error.message });
        }
    },
};
BackgroundService.init();