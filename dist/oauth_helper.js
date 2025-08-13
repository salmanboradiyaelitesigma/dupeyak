/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
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
/*!********************************!*\
  !*** ./src/js/oauth-helper.js ***!
  \********************************/
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

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2F1dGhfaGVscGVyLmpzIiwibWFwcGluZ3MiOiI7O1VBQUE7VUFDQTs7Ozs7V0NEQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHlDQUF5Qyx3Q0FBd0M7V0FDakY7V0FDQTtXQUNBLEU7Ozs7O1dDUEEsd0Y7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdELEU7Ozs7Ozs7Ozs7OztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0NBQWtDO0FBQ2xDLG9DQUFvQztBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbURBQW1ELGdCQUFnQjtBQUNuRTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixxQkFBcUI7QUFDekM7QUFDQTtBQUNBO0FBQ0EsaUNBQWlDLGNBQWM7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFjO0FBQ2Q7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhCQUE4QixnQ0FBZ0M7QUFDOUQ7QUFDQSxnREFBZ0QsZ0JBQWdCO0FBQ2hFO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckIsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQjtBQUNsQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtCQUFrQjtBQUNsQjtBQUNBLHFEQUFxRCxZQUFZLEdBQUcscUJBQXFCO0FBQ3pGO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQixrQkFBa0I7QUFDbEI7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpRUFBZSxXQUFXLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9sYXRlc3Qvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vbGF0ZXN0L3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9sYXRlc3Qvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9sYXRlc3Qvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9sYXRlc3QvLi9zcmMvanMvb2F1dGgtaGVscGVyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFRoZSByZXF1aXJlIHNjb3BlXG52YXIgX193ZWJwYWNrX3JlcXVpcmVfXyA9IHt9O1xuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiLy8gT0F1dGggSGVscGVyIGZvciBEdXBlWWFrIER1cGxpY2F0ZSBSZW1vdmVyXHJcbi8vIEhhbmRsZXMgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2ggdG8gYXZvaWQgYnJvd3NlciByZWRpcmVjdCByZXN0cmljdGlvbnNcclxuY29uc29sZS5sb2coJ+KchSBvYXV0aC1oZWxwZXIuanMgbG9hZGVkJyk7XHJcbmNsYXNzIE9BdXRoSGVscGVyIHtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5hcGlCYXNlVXJsID0gJ2h0dHBzOi8vYXBpLmdwZHJtLmNvbSc7XHJcbiAgICAgICAgdGhpcy5wb2xsSW50ZXJ2YWwgPSAxMDAwOyAvLyBQb2xsIGV2ZXJ5IHNlY29uZFxyXG4gICAgICAgIHRoaXMubWF4UG9sbEF0dGVtcHRzID0gMzAwOyAvLyA1IG1pbnV0ZXMgbWF4XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RhcnQgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2hcclxuICAgIGFzeW5jIHN0YXJ0QXV0aEZsb3coKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJAgU3RhcnRpbmcgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2guLi4nKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogUmVxdWVzdCB3b3JrZXIgdG8gY3JlYXRlIE9BdXRoIHNlc3Npb25cclxuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvblJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5hcGlCYXNlVXJsfS9vYXV0aC9jcmVhdGUtc2Vzc2lvbmAsIHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXNlc3Npb25SZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIE9BdXRoIHNlc3Npb24nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgeyBzZXNzaW9uSWQsIGF1dGhVcmwgfSA9IGF3YWl0IHNlc3Npb25SZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OdIE9BdXRoIHNlc3Npb24gY3JlYXRlZDonLCBzZXNzaW9uSWQpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAyOiBPcGVuIGF1dGggVVJMIGluIG5ldyB0YWJcclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBhdXRoVXJsIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAzOiBTdGFydCBwb2xsaW5nIGZvciByZXN1bHRzXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucG9sbEZvckF1dGhSZXN1bHQoc2Vzc2lvbklkKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBPQXV0aCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVPQXV0aFN1Y2Nlc3MocmVzdWx0LnVzZXJJbmZvKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZXN1bHQuZXJyb3IgfHwgJ09BdXRoIGZhaWxlZCcpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBPQXV0aCBmbG93IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBQb2xsIHdvcmtlciBmb3IgT0F1dGggcmVzdWx0c1xyXG4gICAgYXN5bmMgcG9sbEZvckF1dGhSZXN1bHQoc2Vzc2lvbklkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgU3RhcnRpbmcgdG8gcG9sbCBmb3IgT0F1dGggcmVzdWx0cy4uLicpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IHRoaXMubWF4UG9sbEF0dGVtcHRzOyBhdHRlbXB0KyspIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5hcGlCYXNlVXJsfS9vYXV0aC9jaGVjay1zZXNzaW9uYCwge1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbklkOiBzZXNzaW9uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdQb2xsIHJlcXVlc3QgZmFpbGVkLCByZXRyeWluZy4uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2xlZXAodGhpcy5wb2xsSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OiSBPQXV0aCBjb21wbGV0ZWQhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlckluZm86IHJlc3VsdC51c2VySW5mb1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMgPT09ICdlcnJvcicpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHJlc3VsdC5lcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zdGF0dXMgPT09ICdwZW5kaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0aWxsIHdhaXRpbmcsIGNvbnRpbnVlIHBvbGxpbmdcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg4o+zIFBvbGxpbmcgYXR0ZW1wdCAke2F0dGVtcHQgKyAxfS8ke3RoaXMubWF4UG9sbEF0dGVtcHRzfS4uLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2xlZXAodGhpcy5wb2xsSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gc2Vzc2lvbiBzdGF0dXM6ICcgKyByZXN1bHQuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1BvbGwgYXR0ZW1wdCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCh0aGlzLnBvbGxJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFBvbGxpbmcgdGltZWQgb3V0XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgIGVycm9yOiAnT0F1dGggdGltZW91dCAtIHBsZWFzZSB0cnkgYWdhaW4nXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBIYW5kbGUgc3VjY2Vzc2Z1bCBPQXV0aFxyXG4gICAgYXN5bmMgaGFuZGxlT0F1dGhTdWNjZXNzKHVzZXJJbmZvKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflIQgUHJvY2Vzc2luZyBPQXV0aCBzdWNjZXNzLi4uJyk7XHJcblxyXG4gICAgICAgICAgICAvLyBTdG9yZSB1c2VyIGluZm8gaW4gZXh0ZW5zaW9uIHN0b3JhZ2VcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdXNlckVtYWlsOiB1c2VySW5mby5lbWFpbCxcclxuICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IHVzZXJJbmZvLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dGhUaW1lc3RhbXA6IERhdGUubm93KClcclxuICAgICAgICAgICAgICAgIH0sIHJlc29sdmUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgVXNlciBpbmZvIHN0b3JlZDonLCB1c2VySW5mby5lbWFpbCk7XHJcblxyXG4gICAgICAgICAgICAvLyBOb3RpZnkgZXh0ZW5zaW9uIHBhZ2UgaWYgaXQncyBvcGVuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnYXV0aGVudGljYXRpb25Db21wbGV0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgdXNlckluZm86IHVzZXJJbmZvXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIHBhZ2UgbWlnaHQgbm90IGJlIG9wZW4sIHRoYXQncyBva1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHVzZXJJbmZvOiB1c2VySW5mb1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIGhhbmRsZSBPQXV0aCBzdWNjZXNzOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBzdG9yZWQgdXNlciBpbmZvXHJcbiAgICBhc3luYyBnZXRVc2VySW5mbygpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsndXNlckVtYWlsJywgJ3VzZXJJZCcsICdhdXRoVGltZXN0YW1wJ10sIChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudXNlckVtYWlsICYmIHJlc3VsdC51c2VySWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW1haWw6IHJlc3VsdC51c2VyRW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHJlc3VsdC5hdXRoVGltZXN0YW1wXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHVzZXIgaXMgYXV0aGVudGljYXRlZFxyXG4gICAgYXN5bmMgaXNBdXRoZW50aWNhdGVkKCkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgdGhpcy5nZXRVc2VySW5mbygpO1xyXG4gICAgICAgIHJldHVybiB1c2VySW5mbyAhPT0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTaWduIG91dCB1c2VyXHJcbiAgICBhc3luYyBzaWduT3V0KCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5qqIFNpZ25pbmcgb3V0IHVzZXIuLi4nKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENsZWFyIHN0b3JlZCB1c2VyIGRhdGFcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShbJ3VzZXJFbWFpbCcsICd1c2VySWQnLCAnYXV0aFRpbWVzdGFtcCddLCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIFVzZXIgc2lnbmVkIG91dCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBTaWduIG91dCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXRpbGl0eSBmdW5jdGlvbiB0byBzbGVlcFxyXG4gICAgc2xlZXAobXMpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIHNjcmlwdHNcclxuLy8gaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbi8vICAgICBtb2R1bGUuZXhwb3J0cyA9IE9BdXRoSGVscGVyO1xyXG4vLyB9IFxyXG5cclxuZXhwb3J0IGRlZmF1bHQgT0F1dGhIZWxwZXI7XHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==