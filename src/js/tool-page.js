const firebaseConfig = {
  apiKey: "AIzaSyCC6SilBsdYgtJVL2LGLiewhJXMaNqMrWI",
  authDomain: "dupeyaktest.firebaseapp.com",
  projectId: "dupeyaktest",
  storageBucket: "dupeyaktest.firebasestorage.app",
  messagingSenderId: "820990403204",
  appId: "1:820990403204:web:2a850c95d9d1e3848ed8d1",
  measurementId: "G-9R53SDE1HY"
};


const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const setDoc = firebase.firestore();
const doc = firebase.firestore();


async function storeUserInFirestore(userInfo) {
     return db.collection("users").doc(userInfo.id).set({
    name: userInfo.name,
    email: userInfo.email,
    picture: userInfo.picture,
    loggedInAt: new Date(),
  });
}


async function handleAuthSuccess(userInfo) {
        try {
            await new Promise((resolve) => {
                chrome.storage.local.set({
                    userEmail: userInfo.email,
                    userId: userInfo.id,
                    authTimestamp: Date.now()
                }, resolve);
            });
        } catch (error) {
            console.error('Failed to handle OAuth success:', error);
            throw error;
        }
    }
document.addEventListener('DOMContentLoaded', function () {
    initMainPage();
});

async function initMainPage() {
    try {
        showVersionInfo();
        const userData = await fetchUserData();
        await refreshAuthUI(userData);
        if (userData.userEmail && userData.userId) {
        } else {
            bindEventHandlers();
        }

    } catch (error) {
        console.error('Error initializing page:', error);
        displayError('Failed to initialize extension page');
    }
}

function showVersionInfo() {
    const versionElement = $('#extension-version');
    if (versionElement) {
        const manifest = chrome.runtime.getManifest();
        versionElement.textContent = `v${manifest.version}`;
    }
}

function setAppTitle() {
    const titleElement = $('#app-title');
    if (titleElement) {
            titleElement.textContent = 'DupeYak Duplicate Remover';
    }
}

function setVersionStatus() {
    setAppTitle();
    showVersionInfo();

}
async function fetchUserData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userEmail', 'userId'], (result) => {
            resolve(result);
        });
    });
}

async function refreshAuthUI(userInfo) {
    const accountSection = document.querySelector('.account-section');

    if (userInfo.userEmail && userInfo.userId) {
        accountSection.innerHTML = buildSignedInView(userInfo.userEmail);
        setAppTitle();
    } else {
        accountSection.innerHTML = buildSignInView();
        setAppTitle(false);
    }
}

function buildSignedInView(email) {
    const buttons = [
        `<button class="btn btn-secondary" id="open-photos-btn">
            📸 Open Google Photos
        </button>`
    ];
    buttons.push(`<button class="btn btn-danger" id="sign-out-btn">
        🚪 Sign Out
    </button>`);

    return `
        <div class="account-info">
            <div class="account-details">
                <div class="account-label">Signed in as:</div>
                <div class="account-email">${email}</div>
            </div>
            <div class="account-actions">
                ${buttons.join('\n                ')}
            </div>
        </div>
    `;
}

function buildSignInView() {
    return `
        <div class="signin-container">
            <h2 class="signin-title">Welcome to DupeYak Duplicate Remover</h2>
            <p class="signin-subtitle">Sign in with your Google account to get started</p>
            <button class="btn btn-primary" id="sign-in-btn">
                🔐 Sign in with Google
            </button>
        </div>
    `;
}

function bindEventHandlers() {
    document.getElementById("sign-in-btn").addEventListener("click", async () => {
        chrome.identity.launchWebAuthFlow(
            {
                url: `https://accounts.google.com/o/oauth2/auth?client_id=904093800226-gdsb17l40m0cljstenr7muviigs5qa9k.apps.googleusercontent.com&response_type=token&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL('provider_cb'))}&scope=profile email`,
                interactive: true
            },
            function (redirectUrl) {
                if (chrome.runtime.lastError) {
                    console.error("Login failed:", chrome.runtime.lastError);
                    return;
                }

                const params = new URLSearchParams(new URL(redirectUrl).hash.substring(1));
                const accessToken = params.get("access_token");

                // Call Google User Info API
                fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                })
                    .then(res => res.json())
                    .then(async userInfo => {
                        console.log("User info:", userInfo);
                        handleAuthSuccess(userInfo);
                        
                        storeUserInFirestore(userInfo)
                            .then(() => {
                            })
                            .catch(console.error);

                    });
            }
        );


    });

    const signOutBtn = $('#sign-out-btn');
    if (signOutBtn.length) {
        signOutBtn.on('click', onUserSignOut);
    }

    const openPhotosBtn = $('#open-photos-btn');
    if (openPhotosBtn.length) {
        openPhotosBtn.on('click', onOpenPhotos);
    }
}



async function onUserSignIn() {
    const signInBtn = $('#sign-in-btn');
    if (signInBtn) {
        signInBtn.disabled = true;
        signInBtn.innerHTML = '<div class="spinner"></div> Opening Google OAuth...';
    }

    try {
        const result = await chrome.runtime.sendMessage({
            action: 'authenticate'
        });

        if (result.success) {
            if (signInBtn) {
                signInBtn.innerHTML = '<div class="spinner"></div> Complete sign-in in the opened tab...';
            }
            displaySuccess('Authentication tab opened! Please complete sign-in in the new tab.');
        } else {
            throw new Error(result.error || 'Authentication failed');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        displayError('Failed to start authentication. Please try again.');
        if (signInBtn) {
            signInBtn.disabled = false;
            signInBtn.innerHTML = '🔐 Sign in with Google';
        }
    }
}

async function onUserSignOut() {
    const signOutBtn = $('#sign-out-btn');
    if (signOutBtn) {
        signOutBtn.disabled = true;
        signOutBtn.innerHTML = '<div class="spinner"></div> Signing out...';
    }

    try {
        await new Promise((resolve) => {
            chrome.storage.local.remove([
                'userEmail',
                'userId',
            ], resolve);
        });
        await refreshAuthUI({});
        bindEventHandlers();
        setAppTitle(false);

        displaySuccess('Successfully signed out!');
    } catch (error) {
        console.error('Sign out error:', error);
        displayError('Failed to sign out. Please try again.');
    } finally {
        const signOutBtn = $('#sign-out-btn');
        if (signOutBtn) {
            signOutBtn.disabled = false;
            signOutBtn.innerHTML = '🚪 Sign Out';
        }
    }
}

function onOpenPhotos() {
    chrome.tabs.create({ url: 'https://photos.google.com' });
}
function displaySuccess(message) {
    displayNotification(message, 'success');
}

function displayError(message) {
    displayNotification(message, 'error');
}

function displayNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });

    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#34a853';
            break;
        case 'error':
            notification.style.backgroundColor = '#ea4335';
            break;
        default:
            notification.style.backgroundColor = '#4285f4';
    }
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.userEmail || changes.userId) {
            fetchUserData().then(async userData => {
                await refreshAuthUI(userData);
                bindEventHandlers();
            });
        }
    }
});
// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//     if (message.action === 'authenticationComplete') {
//         const userData = await fetchUserData();
//         await refreshAuthUI(userData);
//         bindEventHandlers();
//         if (userData.userEmail && userData.userId) {
//         }

//         displaySuccess('Authentication completed successfully!');

//         const signInBtn = $('#sign-in-btn');
//         if (signInBtn) {
//             signInBtn.disabled = false;
//             signInBtn.innerHTML = '🔐 Sign in with Google';
//         }
//     }
// });

var extensionPageCore = {
    addEvents: function (params) {
        $(document).on("click", '#sign-out-btn', function (event) {
            onUserSignOut()
        });

        $(document).on("click", '#open-photos-btn', function (event) {
            onOpenPhotos();
        });
    }
}

$(document).ready(function () {
    extensionPageCore.addEvents();
})