/******/ (() => { // webpackBootstrap
/*!******************************!*\
  !*** ./src/js/background.js ***!
  \******************************/


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
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQSwrREFBK0QsZUFBZTtBQUM5RTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLHFDQUFxQyxrQkFBa0I7QUFDdkQsZ0RBQWdELHlCQUF5QjtBQUN6RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBLHFDQUFxQyxpQkFBaUI7QUFDdEQ7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUMsZUFBZTtBQUNsRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUNBQW1DLHlDQUF5QztBQUM1RTtBQUNBLFVBQVU7QUFDVjtBQUNBLDJCQUEyQixzQ0FBc0M7QUFDakU7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixVQUFVO0FBQ1Y7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1DQUFtQyx3REFBd0Q7QUFDM0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxVQUFVO0FBQ1Y7QUFDQSwyQkFBMkIsc0NBQXNDO0FBQ2pFO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1QsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkRBQTZELG1DQUFtQztBQUNoRztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0EscUJBQXFCO0FBQ3JCLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQSwyQkFBMkIsc0NBQXNDO0FBQ2pFO0FBQ0EsS0FBSztBQUNMO0FBQ0EseUIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9sYXRlc3QvLi9zcmMvanMvYmFja2dyb3VuZC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcclxuXHJcbmNvbnN0IEJhY2tncm91bmRTZXJ2aWNlID0ge1xyXG4gICAgaW5pdCgpIHtcclxuICAgICAgICB0aGlzLmluaXRFdmVudEhvb2tzKCk7XHJcbiAgICB9LFxyXG4gICAgaW5pdEV2ZW50SG9va3MoKSB7XHJcbiAgICAgICAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHRhYikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBuZXdUYWIgPSBhd2FpdCBjaHJvbWUudGFicy5jcmVhdGUoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoJ2h0bWwvdG9vbC1wYWdlLmh0bWwnKSxcclxuICAgICAgICAgICAgICAgIGFjdGl2ZTogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuZXdUYWIgJiYgbmV3VGFiLndpbmRvd0lkKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBjaHJvbWUud2luZG93cy51cGRhdGUobmV3VGFiLndpbmRvd0lkLCB7IGZvY3VzZWQ6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2hyb21lLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKGRldGFpbHMpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5vbkV4dGVuc2lvbkluc3RhbGwoZGV0YWlscyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNocm9tZS50YWJzLm9uVXBkYXRlZC5hZGRMaXN0ZW5lcigodGFiSWQsIGNoYW5nZUluZm8sIHRhYikgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm9uVGFiU3RhdHVzQ2hhbmdlKHRhYklkLCBjaGFuZ2VJbmZvLCB0YWIpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub25JbnRlcm5hbE1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIG9uRXh0ZW5zaW9uSW5zdGFsbChkZXRhaWxzKSB7XHJcbiAgICAgICAgaWYgKGRldGFpbHMucmVhc29uID09PSAnaW5zdGFsbCcpIHtcclxuXHJcbiAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XHJcbiAgICAgICAgICAgICAgICBzaW1pbGFyaXR5VGhyZXNob2xkOiA4NSxcclxuICAgICAgICAgICAgICAgIGluc3RhbGxEYXRlOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2h0dHBzOi8vcGhvdG9zLmdvb2dsZS5jb20nXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgb25UYWJTdGF0dXNDaGFuZ2UodGFiSWQsIGNoYW5nZUluZm8sIHRhYikge1xyXG4gICAgICAgIGlmIChjaGFuZ2VJbmZvLnN0YXR1cyAhPT0gJ2NvbXBsZXRlJykgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAodGFiLnVybCAmJiB0YWIudXJsLmluY2x1ZGVzKCdwaG90b3MuZ29vZ2xlLmNvbScpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0SWNvbkZvclBob3Rvcyh0YWJJZCwgdGFiLnVybCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yZXNldERlZmF1bHRJY29uKHRhYklkKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHNldEljb25Gb3JQaG90b3ModGFiSWQsIHVybCkge1xyXG4gICAgICAgIGNocm9tZS5hY3Rpb24uc2V0QmFkZ2VUZXh0KHsgdGFiSWQsIHRleHQ6ICfil48nIH0pO1xyXG4gICAgICAgIGNocm9tZS5hY3Rpb24uc2V0QmFkZ2VCYWNrZ3JvdW5kQ29sb3IoeyB0YWJJZCwgY29sb3I6ICcjNDI4NWY0JyB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgaXNTZWFyY2hQYWdlID0gdXJsLmluY2x1ZGVzKCcvc2VhcmNoLycpIHx8IHVybC5tYXRjaCgvXFwvdVxcL1xcZCtcXC9zZWFyY2hcXC8vKTtcclxuICAgICAgICBjaHJvbWUuYWN0aW9uLnNldFRpdGxlKHtcclxuICAgICAgICAgICAgdGFiSWQsXHJcbiAgICAgICAgICAgIHRpdGxlOiBpc1NlYXJjaFBhZ2UgXHJcbiAgICAgICAgICAgICAgICA/ICdEdXBleWFrIER1cGxpY2F0ZSBSZW1vdmVyIC0gU2VhcmNoIHBhZ2UgZGV0ZWN0ZWQhJyBcclxuICAgICAgICAgICAgICAgIDogJ0R1cGV5YWsgRHVwbGljYXRlIFJlbW92ZXIgLSBOYXZpZ2F0ZSB0byBzZWFyY2ggdG8gZmluZCBkdXBsaWNhdGVzJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICByZXNldERlZmF1bHRJY29uKHRhYklkKSB7XHJcbiAgICAgICAgY2hyb21lLmFjdGlvbi5zZXRCYWRnZVRleHQoeyB0YWJJZCwgdGV4dDogJycgfSk7XHJcbiAgICAgICAgY2hyb21lLmFjdGlvbi5zZXRUaXRsZSh7XHJcbiAgICAgICAgICAgIHRhYklkOiB0YWJJZCxcclxuICAgICAgICAgICAgdGl0bGU6ICdEdXBleWFrIER1cGxpY2F0ZSBSZW1vdmVyIC0gR28gdG8gR29vZ2xlIFBob3RvcyB0byBzdGFydCdcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgYXN5bmMgb25JbnRlcm5hbE1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdyZWNvcmRBbmFseXNpcyc6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWNvcmRBbmFseXNpc1Jlc3VsdChtZXNzYWdlLnJlc3VsdHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAnb25DYXB0dXJlJzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm9uQ2FwdHVyZVBob3RvKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlICdzaWduT3V0JzpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm9uVXNlclNpZ25PdXQobWVzc2FnZSwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1Vua25vd24gYWN0aW9uJyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGhhbmRsaW5nIG1lc3NhZ2U6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGFzeW5jIHJlY29yZEFuYWx5c2lzUmVzdWx0KHJlc3VsdHMpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQmFja2dyb3VuZDlcIilcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHtcclxuICAgICAgICAgICAgICAgIGFuYWx5c2lzUmVzdWx0czogcmVzdWx0cyxcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdGltZXN0YW1wXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvZ2dpbmcgYW5hbHlzaXMgcmVzdWx0OicsIGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgYXN5bmMgb25DYXB0dXJlUGhvdG8ocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQmFja2dyb3VuZDEwXCIpXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbGV0IGVsZW1lbnRJbmZvID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKHJlcXVlc3QuZWxlbWVudElkKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50SW5mbyA9IGF3YWl0IHRoaXMuZmV0Y2hUZW1wRWxlbWVudERhdGEocmVxdWVzdC5lbGVtZW50SWQsIHNlbmRlci50YWIuaWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFlbGVtZW50SW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0NvdWxkIG5vdCBsb2NhdGUgdGVtcCBlbGVtZW50JyB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgc2NyZWVuc2hvdCA9IGF3YWl0IGNocm9tZS50YWJzLmNhcHR1cmVWaXNpYmxlVGFiKHNlbmRlci50YWIud2luZG93SWQsIHtcclxuICAgICAgICAgICAgICAgIGZvcm1hdDogJ2pwZWcnLFxyXG4gICAgICAgICAgICAgICAgcXVhbGl0eTogODVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGxldCBmaW5hbEltYWdlID0gc2NyZWVuc2hvdDtcclxuICAgICAgICAgICAgaWYgKGVsZW1lbnRJbmZvKSB7XHJcbiAgICAgICAgICAgICAgICBmaW5hbEltYWdlID0gYXdhaXQgdGhpcy5jcm9wSW1hZ2VUb1RhcmdldChzY3JlZW5zaG90LCBlbGVtZW50SW5mbyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgaW1hZ2VEYXRhOiBmaW5hbEltYWdlLFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6IGVsZW1lbnRJbmZvID8gZWxlbWVudEluZm8ud2lkdGggOiAxMDI0LFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBlbGVtZW50SW5mbyA/IGVsZW1lbnRJbmZvLmhlaWdodCA6IDc2OCxcclxuICAgICAgICAgICAgICAgIHBob3RvSWQ6IHJlcXVlc3QucGhvdG9JZFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignQmFja2dyb3VuZDogU2NyZWVuc2hvdCBjYXB0dXJlIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIGZldGNoVGVtcEVsZW1lbnREYXRhKGVsZW1lbnRJZCwgdGFiSWQpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2ZldGNoVGVtcEVsZW1lbnREYXRhJyxcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRJZDogZWxlbWVudElkXHJcbiAgICAgICAgICAgIH0sIChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBhc3luYyBjcm9wSW1hZ2VUb1RhcmdldChzY3JlZW5zaG90RGF0YVVybCwgZWxlbWVudEluZm8pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHNjcmVlbnNob3REYXRhVXJsKTtcclxuICAgICAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IHJlc3BvbnNlLmJsb2IoKTtcclxuICAgICAgICAgICAgY29uc3QgaW1hZ2VCaXRtYXAgPSBhd2FpdCBjcmVhdGVJbWFnZUJpdG1hcChibG9iKTtcclxuICAgICAgICAgICAgY29uc3QgY2FudmFzID0gbmV3IE9mZnNjcmVlbkNhbnZhcyhlbGVtZW50SW5mby53aWR0aCwgZWxlbWVudEluZm8uaGVpZ2h0KTtcclxuICAgICAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXHJcbiAgICAgICAgICAgICAgICBpbWFnZUJpdG1hcCxcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRJbmZvLngsIGVsZW1lbnRJbmZvLnksIGVsZW1lbnRJbmZvLndpZHRoLCBlbGVtZW50SW5mby5oZWlnaHQsIFxyXG4gICAgICAgICAgICAgICAgMCwgMCwgZWxlbWVudEluZm8ud2lkdGgsIGVsZW1lbnRJbmZvLmhlaWdodCAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBjb25zdCBjcm9wcGVkQmxvYiA9IGF3YWl0IGNhbnZhcy5jb252ZXJ0VG9CbG9iKHsgdHlwZTogJ2ltYWdlL2pwZWcnLCBxdWFsaXR5OiAwLjg1IH0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkZW5kID0gKCkgPT4gcmVzb2x2ZShyZWFkZXIucmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIHJlYWRlci5vbmVycm9yID0gcmVqZWN0O1xyXG4gICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoY3JvcHBlZEJsb2IpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JvcHBpbmcgaW1hZ2U6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgYXN5bmMgIHNpZ25PdXQoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShbJ3VzZXJFbWFpbCcsICd1c2VySWQnLCAnYXV0aFRpbWVzdGFtcCddLCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2lnbiBvdXQgZmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGFzeW5jIG9uVXNlclNpZ25PdXQobWVzc2FnZSwgc2VuZFJlc3BvbnNlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2lnbk91dCgpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UocmVzdWx0KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTaWduIG91dCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxufTtcclxuQmFja2dyb3VuZFNlcnZpY2UuaW5pdCgpOyJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==