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

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2F1dGhfaGVscGVyLmpzIiwibWFwcGluZ3MiOiI7O1VBQUE7VUFDQTs7Ozs7V0NEQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHlDQUF5Qyx3Q0FBd0M7V0FDakY7V0FDQTtXQUNBLEU7Ozs7O1dDUEEsd0Y7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdELEU7Ozs7Ozs7Ozs7OztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtDQUFrQztBQUNsQyxvQ0FBb0M7QUFDcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1EQUFtRCxnQkFBZ0I7QUFDbkU7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBb0IscUJBQXFCO0FBQ3pDO0FBQ0E7QUFDQTtBQUNBLGlDQUFpQyxjQUFjO0FBQy9DO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4QkFBOEIsZ0NBQWdDO0FBQzlEO0FBQ0EsZ0RBQWdELGdCQUFnQjtBQUNoRTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQSxxREFBcUQsWUFBWSxHQUFHLHFCQUFxQjtBQUN6RjtBQUNBO0FBQ0Esa0JBQWtCO0FBQ2xCO0FBQ0E7QUFDQTtBQUNBLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckIsa0JBQWtCO0FBQ2xCO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUVBQWUsV0FBVyxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vbGF0ZXN0L3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2xhdGVzdC93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vbGF0ZXN0L3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vbGF0ZXN0L3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vbGF0ZXN0Ly4vc3JjL2pzL29hdXRoLWhlbHBlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUaGUgcmVxdWlyZSBzY29wZVxudmFyIF9fd2VicGFja19yZXF1aXJlX18gPSB7fTtcblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIlxyXG5jb25zb2xlLmxvZygn4pyFIG9hdXRoLWhlbHBlci5qcyBsb2FkZWQnKTtcclxuY2xhc3MgT0F1dGhIZWxwZXIge1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmFwaUJhc2VVcmwgPSAnaHR0cHM6Ly9hcGkuZ3Bkcm0uY29tJztcclxuICAgICAgICB0aGlzLnBvbGxJbnRlcnZhbCA9IDEwMDA7IC8vIFBvbGwgZXZlcnkgc2Vjb25kXHJcbiAgICAgICAgdGhpcy5tYXhQb2xsQXR0ZW1wdHMgPSAzMDA7IC8vIDUgbWludXRlcyBtYXhcclxuICAgIH1cclxuXHJcbiAgICAvLyBTdGFydCBPQXV0aCBmbG93IHdpdGggcG9sbGluZyBhcHByb2FjaFxyXG4gICAgYXN5bmMgbGF1bmNoQXV0aEZsb3coKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJAgU3RhcnRpbmcgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2guLi4nKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogUmVxdWVzdCB3b3JrZXIgdG8gY3JlYXRlIE9BdXRoIHNlc3Npb25cclxuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvblJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5hcGlCYXNlVXJsfS9vYXV0aC9jcmVhdGUtc2Vzc2lvbmAsIHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbklkOiBjaHJvbWUucnVudGltZS5pZFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXNlc3Npb25SZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIE9BdXRoIHNlc3Npb24nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgeyBzZXNzaW9uSWQsIGF1dGhVcmwgfSA9IGF3YWl0IHNlc3Npb25SZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OdIE9BdXRoIHNlc3Npb24gY3JlYXRlZDonLCBzZXNzaW9uSWQpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAyOiBPcGVuIGF1dGggVVJMIGluIG5ldyB0YWJcclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBhdXRoVXJsIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAzOiBTdGFydCBwb2xsaW5nIGZvciByZXN1bHRzXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMud2FpdEZvckF1dGhSZXN1bHQoc2Vzc2lvbklkKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBPQXV0aCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVBdXRoU3VjY2VzcyhyZXN1bHQudXNlckluZm8pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCAnT0F1dGggZmFpbGVkJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIE9BdXRoIGZsb3cgZmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFBvbGwgd29ya2VyIGZvciBPQXV0aCByZXN1bHRzXHJcbiAgICBhc3luYyB3YWl0Rm9yQXV0aFJlc3VsdChzZXNzaW9uSWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBTdGFydGluZyB0byBwb2xsIGZvciBPQXV0aCByZXN1bHRzLi4uJyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgdGhpcy5tYXhQb2xsQXR0ZW1wdHM7IGF0dGVtcHQrKykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHt0aGlzLmFwaUJhc2VVcmx9L29hdXRoL2NoZWNrLXNlc3Npb25gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uSWQ6IHNlc3Npb25JZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uSWQ6IGNocm9tZS5ydW50aW1lLmlkXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1BvbGwgcmVxdWVzdCBmYWlsZWQsIHJldHJ5aW5nLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCh0aGlzLnBvbGxJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnY29tcGxldGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46JIE9BdXRoIGNvbXBsZXRlZCEnKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VySW5mbzogcmVzdWx0LnVzZXJJbmZvXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LnN0YXR1cyA9PT0gJ2Vycm9yJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogcmVzdWx0LmVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LnN0YXR1cyA9PT0gJ3BlbmRpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RpbGwgd2FpdGluZywgY29udGludWUgcG9sbGluZ1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDij7MgUG9sbGluZyBhdHRlbXB0ICR7YXR0ZW1wdCArIDF9LyR7dGhpcy5tYXhQb2xsQXR0ZW1wdHN9Li4uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCh0aGlzLnBvbGxJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBzZXNzaW9uIHN0YXR1czogJyArIHJlc3VsdC5zdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignUG9sbCBhdHRlbXB0IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKHRoaXMucG9sbEludGVydmFsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUG9sbGluZyB0aW1lZCBvdXRcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgZXJyb3I6ICdPQXV0aCB0aW1lb3V0IC0gcGxlYXNlIHRyeSBhZ2FpbidcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEhhbmRsZSBzdWNjZXNzZnVsIE9BdXRoXHJcbiAgICBhc3luYyBoYW5kbGVBdXRoU3VjY2Vzcyh1c2VySW5mbykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIFByb2Nlc3NpbmcgT0F1dGggc3VjY2Vzcy4uLicpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RvcmUgdXNlciBpbmZvIGluIGV4dGVuc2lvbiBzdG9yYWdlXHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJFbWFpbDogdXNlckluZm8uZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgdXNlcklkOiB1c2VySW5mby5pZCxcclxuICAgICAgICAgICAgICAgICAgICBhdXRoVGltZXN0YW1wOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9LCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIFVzZXIgaW5mbyBzdG9yZWQ6JywgdXNlckluZm8uZW1haWwpO1xyXG5cclxuICAgICAgICAgICAgLy8gTm90aWZ5IGV4dGVuc2lvbiBwYWdlIGlmIGl0J3Mgb3BlblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2F1dGhlbnRpY2F0aW9uQ29tcGxldGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJJbmZvOiB1c2VySW5mb1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBwYWdlIG1pZ2h0IG5vdCBiZSBvcGVuLCB0aGF0J3Mgb2tcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB1c2VySW5mbzogdXNlckluZm9cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBoYW5kbGUgT0F1dGggc3VjY2VzczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgc3RvcmVkIHVzZXIgaW5mb1xyXG4gICAgYXN5bmMgZmV0Y2hVc2VyUHJvZmlsZSgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsndXNlckVtYWlsJywgJ3VzZXJJZCcsICdhdXRoVGltZXN0YW1wJ10sIChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudXNlckVtYWlsICYmIHJlc3VsdC51c2VySWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW1haWw6IHJlc3VsdC51c2VyRW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHJlc3VsdC5hdXRoVGltZXN0YW1wXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHVzZXIgaXMgYXV0aGVudGljYXRlZFxyXG4gICAgYXN5bmMgaXNBdXRoZW50aWNhdGVkKCkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgdGhpcy5mZXRjaFVzZXJQcm9maWxlKCk7XHJcbiAgICAgICAgcmV0dXJuIHVzZXJJbmZvICE9PSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNpZ24gb3V0IHVzZXJcclxuICAgIGFzeW5jIHNpZ25PdXQoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfmqogU2lnbmluZyBvdXQgdXNlci4uLicpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ2xlYXIgc3RvcmVkIHVzZXIgZGF0YVxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKFsndXNlckVtYWlsJywgJ3VzZXJJZCcsICdhdXRoVGltZXN0YW1wJ10sIHJlc29sdmUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgVXNlciBzaWduZWQgb3V0IHN1Y2Nlc3NmdWxseScpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFNpZ24gb3V0IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBVdGlsaXR5IGZ1bmN0aW9uIHRvIHNsZWVwXHJcbiAgICBzbGVlcChtcykge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgc2NyaXB0c1xyXG4vLyBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gT0F1dGhIZWxwZXI7XHJcbi8vIH0gXHJcblxyXG5leHBvcnQgZGVmYXVsdCBPQXV0aEhlbHBlcjtcclxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9