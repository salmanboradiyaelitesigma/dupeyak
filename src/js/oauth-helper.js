
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

export default OAuthHelper;
