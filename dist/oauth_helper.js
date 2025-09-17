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
        this.pollInterval = 1000; 
        this.maxPollAttempts = 300; 
    }

    async launchAuthFlow() {
        try {
            console.log('🔐 Starting OAuth flow with polling approach...');

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

            chrome.tabs.create({ url: authUrl });

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

        return {
            success: false,
            error: 'OAuth timeout - please try again'
        };
    }

    async handleAuthSuccess(userInfo) {
        try {
            console.log('🔄 Processing OAuth success...');

            await new Promise((resolve) => {
                chrome.storage.local.set({
                    userEmail: userInfo.email,
                    userId: userInfo.id,
                    authTimestamp: Date.now()
                }, resolve);
            });

            console.log('✅ User info stored:', userInfo.email);

            try {
                chrome.runtime.sendMessage({
                    action: 'authenticationComplete',
                    userInfo: userInfo
                });
            } catch (e) {
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

    async isAuthenticated() {
        const userInfo = await this.fetchUserProfile();
        return userInfo !== null;
    }

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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (OAuthHelper);

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2F1dGhfaGVscGVyLmpzIiwibWFwcGluZ3MiOiI7O1VBQUE7VUFDQTs7Ozs7V0NEQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHlDQUF5Qyx3Q0FBd0M7V0FDakY7V0FDQTtXQUNBLEU7Ozs7O1dDUEEsd0Y7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdELEU7Ozs7Ozs7Ozs7OztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtREFBbUQsZ0JBQWdCO0FBQ25FO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLHFCQUFxQjtBQUN6QztBQUNBO0FBQ0EsaUNBQWlDLGNBQWM7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCLGdDQUFnQztBQUM5RDtBQUNBLGdEQUFnRCxnQkFBZ0I7QUFDaEU7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQixpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0JBQWtCO0FBQ2xCO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0JBQWtCO0FBQ2xCLHFEQUFxRCxZQUFZLEdBQUcscUJBQXFCO0FBQ3pGO0FBQ0E7QUFDQSxrQkFBa0I7QUFDbEI7QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQixrQkFBa0I7QUFDbEI7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlFQUFlLFdBQVcsRUFBQyIsInNvdXJjZXMiOlsid2VicGFjazovL2xhdGVzdC93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9sYXRlc3Qvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL2xhdGVzdC93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL2xhdGVzdC93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL2xhdGVzdC8uL3NyYy9qcy9vYXV0aC1oZWxwZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gVGhlIHJlcXVpcmUgc2NvcGVcbnZhciBfX3dlYnBhY2tfcmVxdWlyZV9fID0ge307XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJcclxuY29uc29sZS5sb2coJ+KchSBvYXV0aC1oZWxwZXIuanMgbG9hZGVkJyk7XHJcbmNsYXNzIE9BdXRoSGVscGVyIHtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5hcGlCYXNlVXJsID0gJ2h0dHBzOi8vYXBpLmdwZHJtLmNvbSc7XHJcbiAgICAgICAgdGhpcy5wb2xsSW50ZXJ2YWwgPSAxMDAwOyBcclxuICAgICAgICB0aGlzLm1heFBvbGxBdHRlbXB0cyA9IDMwMDsgXHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgbGF1bmNoQXV0aEZsb3coKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJAgU3RhcnRpbmcgT0F1dGggZmxvdyB3aXRoIHBvbGxpbmcgYXBwcm9hY2guLi4nKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25SZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3RoaXMuYXBpQmFzZVVybH0vb2F1dGgvY3JlYXRlLXNlc3Npb25gLCB7XHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25JZDogY2hyb21lLnJ1bnRpbWUuaWRcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFzZXNzaW9uUmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNyZWF0ZSBPQXV0aCBzZXNzaW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHsgc2Vzc2lvbklkLCBhdXRoVXJsIH0gPSBhd2FpdCBzZXNzaW9uUmVzcG9uc2UuanNvbigpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TnSBPQXV0aCBzZXNzaW9uIGNyZWF0ZWQ6Jywgc2Vzc2lvbklkKTtcclxuXHJcbiAgICAgICAgICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogYXV0aFVybCB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMud2FpdEZvckF1dGhSZXN1bHQoc2Vzc2lvbklkKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBPQXV0aCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVBdXRoU3VjY2VzcyhyZXN1bHQudXNlckluZm8pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCAnT0F1dGggZmFpbGVkJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIE9BdXRoIGZsb3cgZmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHdhaXRGb3JBdXRoUmVzdWx0KHNlc3Npb25JZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIFN0YXJ0aW5nIHRvIHBvbGwgZm9yIE9BdXRoIHJlc3VsdHMuLi4nKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCB0aGlzLm1heFBvbGxBdHRlbXB0czsgYXR0ZW1wdCsrKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3RoaXMuYXBpQmFzZVVybH0vb2F1dGgvY2hlY2stc2Vzc2lvbmAsIHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25JZDogc2Vzc2lvbklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25JZDogY2hyb21lLnJ1bnRpbWUuaWRcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignUG9sbCByZXF1ZXN0IGZhaWxlZCwgcmV0cnlpbmcuLi4nKTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKHRoaXMucG9sbEludGVydmFsKTtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfjokgT0F1dGggY29tcGxldGVkIScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJJbmZvOiByZXN1bHQudXNlckluZm9cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZXJyb3InKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiByZXN1bHQuZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuc3RhdHVzID09PSAncGVuZGluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg4o+zIFBvbGxpbmcgYXR0ZW1wdCAke2F0dGVtcHQgKyAxfS8ke3RoaXMubWF4UG9sbEF0dGVtcHRzfS4uLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2xlZXAodGhpcy5wb2xsSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gc2Vzc2lvbiBzdGF0dXM6ICcgKyByZXN1bHQuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1BvbGwgYXR0ZW1wdCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcCh0aGlzLnBvbGxJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICBlcnJvcjogJ09BdXRoIHRpbWVvdXQgLSBwbGVhc2UgdHJ5IGFnYWluJ1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgaGFuZGxlQXV0aFN1Y2Nlc3ModXNlckluZm8pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBQcm9jZXNzaW5nIE9BdXRoIHN1Y2Nlc3MuLi4nKTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJFbWFpbDogdXNlckluZm8uZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgdXNlcklkOiB1c2VySW5mby5pZCxcclxuICAgICAgICAgICAgICAgICAgICBhdXRoVGltZXN0YW1wOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9LCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIFVzZXIgaW5mbyBzdG9yZWQ6JywgdXNlckluZm8uZW1haWwpO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdhdXRoZW50aWNhdGlvbkNvbXBsZXRlJyxcclxuICAgICAgICAgICAgICAgICAgICB1c2VySW5mbzogdXNlckluZm9cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdXNlckluZm86IHVzZXJJbmZvXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gaGFuZGxlIE9BdXRoIHN1Y2Nlc3M6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZmV0Y2hVc2VyUHJvZmlsZSgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsndXNlckVtYWlsJywgJ3VzZXJJZCcsICdhdXRoVGltZXN0YW1wJ10sIChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudXNlckVtYWlsICYmIHJlc3VsdC51c2VySWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW1haWw6IHJlc3VsdC51c2VyRW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHJlc3VsdC5hdXRoVGltZXN0YW1wXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGlzQXV0aGVudGljYXRlZCgpIHtcclxuICAgICAgICBjb25zdCB1c2VySW5mbyA9IGF3YWl0IHRoaXMuZmV0Y2hVc2VyUHJvZmlsZSgpO1xyXG4gICAgICAgIHJldHVybiB1c2VySW5mbyAhPT0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBzaWduT3V0KCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5qqIFNpZ25pbmcgb3V0IHVzZXIuLi4nKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENsZWFyIHN0b3JlZCB1c2VyIGRhdGFcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShbJ3VzZXJFbWFpbCcsICd1c2VySWQnLCAnYXV0aFRpbWVzdGFtcCddLCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIFVzZXIgc2lnbmVkIG91dCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBTaWduIG91dCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2xlZXAobXMpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IE9BdXRoSGVscGVyO1xyXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=