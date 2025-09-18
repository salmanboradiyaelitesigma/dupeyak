/******/ (() => { // webpackBootstrap
/*!*****************************!*\
  !*** ./src/js/tool-page.js ***!
  \*****************************/
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
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O0FBQ0EsU0FBUztBQUNULEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDLEMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9sYXRlc3QvLi9zcmMvanMvdG9vbC1wYWdlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGZpcmViYXNlQ29uZmlnID0ge1xyXG4gIGFwaUtleTogXCJBSXphU3lDQzZTaWxCc2RZZ3RKVkwyTEdMaWV3aEpYTWFOcU1yV0lcIixcclxuICBhdXRoRG9tYWluOiBcImR1cGV5YWt0ZXN0LmZpcmViYXNlYXBwLmNvbVwiLFxyXG4gIHByb2plY3RJZDogXCJkdXBleWFrdGVzdFwiLFxyXG4gIHN0b3JhZ2VCdWNrZXQ6IFwiZHVwZXlha3Rlc3QuZmlyZWJhc2VzdG9yYWdlLmFwcFwiLFxyXG4gIG1lc3NhZ2luZ1NlbmRlcklkOiBcIjgyMDk5MDQwMzIwNFwiLFxyXG4gIGFwcElkOiBcIjE6ODIwOTkwNDAzMjA0OndlYjoyYTg1MGM5NWQ5ZDFlMzg0OGVkOGQxXCIsXHJcbiAgbWVhc3VyZW1lbnRJZDogXCJHLTlSNTNTREUxSFlcIlxyXG59O1xyXG5cclxuXHJcbmNvbnN0IGFwcCA9IGZpcmViYXNlLmluaXRpYWxpemVBcHAoZmlyZWJhc2VDb25maWcpO1xyXG5jb25zdCBhdXRoID0gZmlyZWJhc2UuYXV0aCgpO1xyXG5jb25zdCBkYiA9IGZpcmViYXNlLmZpcmVzdG9yZSgpO1xyXG5jb25zdCBzZXREb2MgPSBmaXJlYmFzZS5maXJlc3RvcmUoKTtcclxuY29uc3QgZG9jID0gZmlyZWJhc2UuZmlyZXN0b3JlKCk7XHJcblxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc3RvcmVVc2VySW5GaXJlc3RvcmUodXNlckluZm8pIHtcclxuICAgICByZXR1cm4gZGIuY29sbGVjdGlvbihcInVzZXJzXCIpLmRvYyh1c2VySW5mby5pZCkuc2V0KHtcclxuICAgIG5hbWU6IHVzZXJJbmZvLm5hbWUsXHJcbiAgICBlbWFpbDogdXNlckluZm8uZW1haWwsXHJcbiAgICBwaWN0dXJlOiB1c2VySW5mby5waWN0dXJlLFxyXG4gICAgbG9nZ2VkSW5BdDogbmV3IERhdGUoKSxcclxuICB9KTtcclxufVxyXG5cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUF1dGhTdWNjZXNzKHVzZXJJbmZvKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdXNlckVtYWlsOiB1c2VySW5mby5lbWFpbCxcclxuICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IHVzZXJJbmZvLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dGhUaW1lc3RhbXA6IERhdGUubm93KClcclxuICAgICAgICAgICAgICAgIH0sIHJlc29sdmUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaGFuZGxlIE9BdXRoIHN1Y2Nlc3M6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBpbml0TWFpblBhZ2UoKTtcclxufSk7XHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbml0TWFpblBhZ2UoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHNob3dWZXJzaW9uSW5mbygpO1xyXG4gICAgICAgIGNvbnN0IHVzZXJEYXRhID0gYXdhaXQgZmV0Y2hVc2VyRGF0YSgpO1xyXG4gICAgICAgIGF3YWl0IHJlZnJlc2hBdXRoVUkodXNlckRhdGEpO1xyXG4gICAgICAgIGlmICh1c2VyRGF0YS51c2VyRW1haWwgJiYgdXNlckRhdGEudXNlcklkKSB7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYmluZEV2ZW50SGFuZGxlcnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbml0aWFsaXppbmcgcGFnZTonLCBlcnJvcik7XHJcbiAgICAgICAgZGlzcGxheUVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBleHRlbnNpb24gcGFnZScpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG93VmVyc2lvbkluZm8oKSB7XHJcbiAgICBjb25zdCB2ZXJzaW9uRWxlbWVudCA9ICQoJyNleHRlbnNpb24tdmVyc2lvbicpO1xyXG4gICAgaWYgKHZlcnNpb25FbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3QgbWFuaWZlc3QgPSBjaHJvbWUucnVudGltZS5nZXRNYW5pZmVzdCgpO1xyXG4gICAgICAgIHZlcnNpb25FbGVtZW50LnRleHRDb250ZW50ID0gYHYke21hbmlmZXN0LnZlcnNpb259YDtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2V0QXBwVGl0bGUoKSB7XHJcbiAgICBjb25zdCB0aXRsZUVsZW1lbnQgPSAkKCcjYXBwLXRpdGxlJyk7XHJcbiAgICBpZiAodGl0bGVFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHRpdGxlRWxlbWVudC50ZXh0Q29udGVudCA9ICdEdXBlWWFrIER1cGxpY2F0ZSBSZW1vdmVyJztcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2V0VmVyc2lvblN0YXR1cygpIHtcclxuICAgIHNldEFwcFRpdGxlKCk7XHJcbiAgICBzaG93VmVyc2lvbkluZm8oKTtcclxuXHJcbn1cclxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hVc2VyRGF0YSgpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ3VzZXJFbWFpbCcsICd1c2VySWQnXSwgKHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcmVmcmVzaEF1dGhVSSh1c2VySW5mbykge1xyXG4gICAgY29uc3QgYWNjb3VudFNlY3Rpb24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWNjb3VudC1zZWN0aW9uJyk7XHJcblxyXG4gICAgaWYgKHVzZXJJbmZvLnVzZXJFbWFpbCAmJiB1c2VySW5mby51c2VySWQpIHtcclxuICAgICAgICBhY2NvdW50U2VjdGlvbi5pbm5lckhUTUwgPSBidWlsZFNpZ25lZEluVmlldyh1c2VySW5mby51c2VyRW1haWwpO1xyXG4gICAgICAgIHNldEFwcFRpdGxlKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGFjY291bnRTZWN0aW9uLmlubmVySFRNTCA9IGJ1aWxkU2lnbkluVmlldygpO1xyXG4gICAgICAgIHNldEFwcFRpdGxlKGZhbHNlKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRTaWduZWRJblZpZXcoZW1haWwpIHtcclxuICAgIGNvbnN0IGJ1dHRvbnMgPSBbXHJcbiAgICAgICAgYDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGlkPVwib3Blbi1waG90b3MtYnRuXCI+XHJcbiAgICAgICAgICAgIPCfk7ggT3BlbiBHb29nbGUgUGhvdG9zXHJcbiAgICAgICAgPC9idXR0b24+YFxyXG4gICAgXTtcclxuICAgIGJ1dHRvbnMucHVzaChgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tZGFuZ2VyXCIgaWQ9XCJzaWduLW91dC1idG5cIj5cclxuICAgICAgICDwn5qqIFNpZ24gT3V0XHJcbiAgICA8L2J1dHRvbj5gKTtcclxuXHJcbiAgICByZXR1cm4gYFxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWluZm9cIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtZGV0YWlsc1wiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtbGFiZWxcIj5TaWduZWQgaW4gYXM6PC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1lbWFpbFwiPiR7ZW1haWx9PC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1hY3Rpb25zXCI+XHJcbiAgICAgICAgICAgICAgICAke2J1dHRvbnMuam9pbignXFxuICAgICAgICAgICAgICAgICcpfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgIGA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJ1aWxkU2lnbkluVmlldygpIHtcclxuICAgIHJldHVybiBgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cInNpZ25pbi1jb250YWluZXJcIj5cclxuICAgICAgICAgICAgPGgyIGNsYXNzPVwic2lnbmluLXRpdGxlXCI+V2VsY29tZSB0byBEdXBlWWFrIER1cGxpY2F0ZSBSZW1vdmVyPC9oMj5cclxuICAgICAgICAgICAgPHAgY2xhc3M9XCJzaWduaW4tc3VidGl0bGVcIj5TaWduIGluIHdpdGggeW91ciBHb29nbGUgYWNjb3VudCB0byBnZXQgc3RhcnRlZDwvcD5cclxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tcHJpbWFyeVwiIGlkPVwic2lnbi1pbi1idG5cIj5cclxuICAgICAgICAgICAgICAgIPCflJAgU2lnbiBpbiB3aXRoIEdvb2dsZVxyXG4gICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgIGA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJpbmRFdmVudEhhbmRsZXJzKCkge1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaWduLWluLWJ0blwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGNocm9tZS5pZGVudGl0eS5sYXVuY2hXZWJBdXRoRmxvdyhcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdXJsOiBgaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGg/Y2xpZW50X2lkPTkwNDA5MzgwMDIyNi1nZHNiMTdsNDBtMGNsanN0ZW5yN211dmlpZ3M1cWE5ay5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSZyZXNwb25zZV90eXBlPXRva2VuJnJlZGlyZWN0X3VyaT0ke2VuY29kZVVSSUNvbXBvbmVudChjaHJvbWUuaWRlbnRpdHkuZ2V0UmVkaXJlY3RVUkwoJ3Byb3ZpZGVyX2NiJykpfSZzY29wZT1wcm9maWxlIGVtYWlsYCxcclxuICAgICAgICAgICAgICAgIGludGVyYWN0aXZlOiB0cnVlXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIChyZWRpcmVjdFVybCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJMb2dpbiBmYWlsZWQ6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobmV3IFVSTChyZWRpcmVjdFVybCkuaGFzaC5zdWJzdHJpbmcoMSkpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYWNjZXNzVG9rZW4gPSBwYXJhbXMuZ2V0KFwiYWNjZXNzX3Rva2VuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIENhbGwgR29vZ2xlIFVzZXIgSW5mbyBBUElcclxuICAgICAgICAgICAgICAgIGZldGNoKFwiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YyL3VzZXJpbmZvXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHthY2Nlc3NUb2tlbn1gLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGFzeW5jIHVzZXJJbmZvID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJVc2VyIGluZm86XCIsIHVzZXJJbmZvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlQXV0aFN1Y2Nlc3ModXNlckluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmVVc2VySW5GaXJlc3RvcmUodXNlckluZm8pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICk7XHJcblxyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHNpZ25PdXRCdG4gPSAkKCcjc2lnbi1vdXQtYnRuJyk7XHJcbiAgICBpZiAoc2lnbk91dEJ0bi5sZW5ndGgpIHtcclxuICAgICAgICBzaWduT3V0QnRuLm9uKCdjbGljaycsIG9uVXNlclNpZ25PdXQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG9wZW5QaG90b3NCdG4gPSAkKCcjb3Blbi1waG90b3MtYnRuJyk7XHJcbiAgICBpZiAob3BlblBob3Rvc0J0bi5sZW5ndGgpIHtcclxuICAgICAgICBvcGVuUGhvdG9zQnRuLm9uKCdjbGljaycsIG9uT3BlblBob3Rvcyk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5cclxuYXN5bmMgZnVuY3Rpb24gb25Vc2VyU2lnbkluKCkge1xyXG4gICAgY29uc3Qgc2lnbkluQnRuID0gJCgnI3NpZ24taW4tYnRuJyk7XHJcbiAgICBpZiAoc2lnbkluQnRuKSB7XHJcbiAgICAgICAgc2lnbkluQnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICBzaWduSW5CdG4uaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+IE9wZW5pbmcgR29vZ2xlIE9BdXRoLi4uJztcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuICAgICAgICAgICAgYWN0aW9uOiAnYXV0aGVudGljYXRlJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4gICAgICAgICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjwvZGl2PiBDb21wbGV0ZSBzaWduLWluIGluIHRoZSBvcGVuZWQgdGFiLi4uJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkaXNwbGF5U3VjY2VzcygnQXV0aGVudGljYXRpb24gdGFiIG9wZW5lZCEgUGxlYXNlIGNvbXBsZXRlIHNpZ24taW4gaW4gdGhlIG5ldyB0YWIuJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCAnQXV0aGVudGljYXRpb24gZmFpbGVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdTaWduIGluIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgICBkaXNwbGF5RXJyb3IoJ0ZhaWxlZCB0byBzdGFydCBhdXRoZW50aWNhdGlvbi4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuICAgICAgICBpZiAoc2lnbkluQnRuKSB7XHJcbiAgICAgICAgICAgIHNpZ25JbkJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBzaWduSW5CdG4uaW5uZXJIVE1MID0gJ/CflJAgU2lnbiBpbiB3aXRoIEdvb2dsZSc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBvblVzZXJTaWduT3V0KCkge1xyXG4gICAgY29uc3Qgc2lnbk91dEJ0biA9ICQoJyNzaWduLW91dC1idG4nKTtcclxuICAgIGlmIChzaWduT3V0QnRuKSB7XHJcbiAgICAgICAgc2lnbk91dEJ0bi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgc2lnbk91dEJ0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gU2lnbmluZyBvdXQuLi4nO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKFtcclxuICAgICAgICAgICAgICAgICd1c2VyRW1haWwnLFxyXG4gICAgICAgICAgICAgICAgJ3VzZXJJZCcsXHJcbiAgICAgICAgICAgIF0sIHJlc29sdmUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGF3YWl0IHJlZnJlc2hBdXRoVUkoe30pO1xyXG4gICAgICAgIGJpbmRFdmVudEhhbmRsZXJzKCk7XHJcbiAgICAgICAgc2V0QXBwVGl0bGUoZmFsc2UpO1xyXG5cclxuICAgICAgICBkaXNwbGF5U3VjY2VzcygnU3VjY2Vzc2Z1bGx5IHNpZ25lZCBvdXQhJyk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpZ24gb3V0IGVycm9yOicsIGVycm9yKTtcclxuICAgICAgICBkaXNwbGF5RXJyb3IoJ0ZhaWxlZCB0byBzaWduIG91dC4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgY29uc3Qgc2lnbk91dEJ0biA9ICQoJyNzaWduLW91dC1idG4nKTtcclxuICAgICAgICBpZiAoc2lnbk91dEJ0bikge1xyXG4gICAgICAgICAgICBzaWduT3V0QnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNpZ25PdXRCdG4uaW5uZXJIVE1MID0gJ/CfmqogU2lnbiBPdXQnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gb25PcGVuUGhvdG9zKCkge1xyXG4gICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiAnaHR0cHM6Ly9waG90b3MuZ29vZ2xlLmNvbScgfSk7XHJcbn1cclxuZnVuY3Rpb24gZGlzcGxheVN1Y2Nlc3MobWVzc2FnZSkge1xyXG4gICAgZGlzcGxheU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNwbGF5RXJyb3IobWVzc2FnZSkge1xyXG4gICAgZGlzcGxheU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnZXJyb3InKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzcGxheU5vdGlmaWNhdGlvbihtZXNzYWdlLCB0eXBlID0gJ2luZm8nKSB7XHJcbiAgICBjb25zdCBub3RpZmljYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIG5vdGlmaWNhdGlvbi5jbGFzc05hbWUgPSBgbm90aWZpY2F0aW9uIG5vdGlmaWNhdGlvbi0ke3R5cGV9YDtcclxuICAgIG5vdGlmaWNhdGlvbi50ZXh0Q29udGVudCA9IG1lc3NhZ2U7XHJcblxyXG4gICAgT2JqZWN0LmFzc2lnbihub3RpZmljYXRpb24uc3R5bGUsIHtcclxuICAgICAgICBwb3NpdGlvbjogJ2ZpeGVkJyxcclxuICAgICAgICB0b3A6ICcyMHB4JyxcclxuICAgICAgICByaWdodDogJzIwcHgnLFxyXG4gICAgICAgIHBhZGRpbmc6ICcxMnB4IDIwcHgnLFxyXG4gICAgICAgIGJvcmRlclJhZGl1czogJzhweCcsXHJcbiAgICAgICAgY29sb3I6ICd3aGl0ZScsXHJcbiAgICAgICAgZm9udFdlaWdodDogJzUwMCcsXHJcbiAgICAgICAgekluZGV4OiAnMTAwMDAnLFxyXG4gICAgICAgIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVgoMTAwJSknLFxyXG4gICAgICAgIHRyYW5zaXRpb246ICd0cmFuc2Zvcm0gMC4zcyBlYXNlJyxcclxuICAgICAgICBtYXhXaWR0aDogJzMwMHB4JyxcclxuICAgICAgICB3b3JkV3JhcDogJ2JyZWFrLXdvcmQnXHJcbiAgICB9KTtcclxuXHJcbiAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICBjYXNlICdzdWNjZXNzJzpcclxuICAgICAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcjMzRhODUzJztcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAnZXJyb3InOlxyXG4gICAgICAgICAgICBub3RpZmljYXRpb24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNlYTQzMzUnO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICBub3RpZmljYXRpb24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyM0Mjg1ZjQnO1xyXG4gICAgfVxyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub3RpZmljYXRpb24pO1xyXG5cclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgwKSc7XHJcbiAgICB9LCAxMDApO1xyXG5cclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWCgxMDAlKSc7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChub3RpZmljYXRpb24ucGFyZW50Tm9kZSkge1xyXG4gICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm90aWZpY2F0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDMwMCk7XHJcbiAgICB9LCAzMDAwKTtcclxufVxyXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xyXG4gICAgaWYgKG5hbWVzcGFjZSA9PT0gJ2xvY2FsJykge1xyXG4gICAgICAgIGlmIChjaGFuZ2VzLnVzZXJFbWFpbCB8fCBjaGFuZ2VzLnVzZXJJZCkge1xyXG4gICAgICAgICAgICBmZXRjaFVzZXJEYXRhKCkudGhlbihhc3luYyB1c2VyRGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCByZWZyZXNoQXV0aFVJKHVzZXJEYXRhKTtcclxuICAgICAgICAgICAgICAgIGJpbmRFdmVudEhhbmRsZXJzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcbi8vIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihhc3luYyAobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuLy8gICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gJ2F1dGhlbnRpY2F0aW9uQ29tcGxldGUnKSB7XHJcbi8vICAgICAgICAgY29uc3QgdXNlckRhdGEgPSBhd2FpdCBmZXRjaFVzZXJEYXRhKCk7XHJcbi8vICAgICAgICAgYXdhaXQgcmVmcmVzaEF1dGhVSSh1c2VyRGF0YSk7XHJcbi8vICAgICAgICAgYmluZEV2ZW50SGFuZGxlcnMoKTtcclxuLy8gICAgICAgICBpZiAodXNlckRhdGEudXNlckVtYWlsICYmIHVzZXJEYXRhLnVzZXJJZCkge1xyXG4vLyAgICAgICAgIH1cclxuXHJcbi8vICAgICAgICAgZGlzcGxheVN1Y2Nlc3MoJ0F1dGhlbnRpY2F0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkhJyk7XHJcblxyXG4vLyAgICAgICAgIGNvbnN0IHNpZ25JbkJ0biA9ICQoJyNzaWduLWluLWJ0bicpO1xyXG4vLyAgICAgICAgIGlmIChzaWduSW5CdG4pIHtcclxuLy8gICAgICAgICAgICAgc2lnbkluQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbi8vICAgICAgICAgICAgIHNpZ25JbkJ0bi5pbm5lckhUTUwgPSAn8J+UkCBTaWduIGluIHdpdGggR29vZ2xlJztcclxuLy8gICAgICAgICB9XHJcbi8vICAgICB9XHJcbi8vIH0pO1xyXG5cclxudmFyIGV4dGVuc2lvblBhZ2VDb3JlID0ge1xyXG4gICAgYWRkRXZlbnRzOiBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICAgICAgJChkb2N1bWVudCkub24oXCJjbGlja1wiLCAnI3NpZ24tb3V0LWJ0bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBvblVzZXJTaWduT3V0KClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJChkb2N1bWVudCkub24oXCJjbGlja1wiLCAnI29wZW4tcGhvdG9zLWJ0bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBvbk9wZW5QaG90b3MoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xyXG4gICAgZXh0ZW5zaW9uUGFnZUNvcmUuYWRkRXZlbnRzKCk7XHJcbn0pIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9