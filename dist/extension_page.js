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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O0FBQ0E7QUFDQSxTQUFTO0FBQ1QsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUMsQyIsInNvdXJjZXMiOlsid2VicGFjazovL2xhdGVzdC8uL3NyYy9qcy90b29sLXBhZ2UuanMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZmlyZWJhc2VDb25maWcgPSB7XHJcbiAgYXBpS2V5OiBcIkFJemFTeUNDNlNpbEJzZFlndEpWTDJMR0xpZXdoSlhNYU5xTXJXSVwiLFxyXG4gIGF1dGhEb21haW46IFwiZHVwZXlha3Rlc3QuZmlyZWJhc2VhcHAuY29tXCIsXHJcbiAgcHJvamVjdElkOiBcImR1cGV5YWt0ZXN0XCIsXHJcbiAgc3RvcmFnZUJ1Y2tldDogXCJkdXBleWFrdGVzdC5maXJlYmFzZXN0b3JhZ2UuYXBwXCIsXHJcbiAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiODIwOTkwNDAzMjA0XCIsXHJcbiAgYXBwSWQ6IFwiMTo4MjA5OTA0MDMyMDQ6d2ViOjJhODUwYzk1ZDlkMWUzODQ4ZWQ4ZDFcIixcclxuICBtZWFzdXJlbWVudElkOiBcIkctOVI1M1NERTFIWVwiXHJcbn07XHJcblxyXG5cclxuY29uc3QgYXBwID0gZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChmaXJlYmFzZUNvbmZpZyk7XHJcbmNvbnN0IGF1dGggPSBmaXJlYmFzZS5hdXRoKCk7XHJcbmNvbnN0IGRiID0gZmlyZWJhc2UuZmlyZXN0b3JlKCk7XHJcbmNvbnN0IHNldERvYyA9IGZpcmViYXNlLmZpcmVzdG9yZSgpO1xyXG5jb25zdCBkb2MgPSBmaXJlYmFzZS5maXJlc3RvcmUoKTtcclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiBzdG9yZVVzZXJJbkZpcmVzdG9yZSh1c2VySW5mbykge1xyXG4gICAgIHJldHVybiBkYi5jb2xsZWN0aW9uKFwidXNlcnNcIikuZG9jKHVzZXJJbmZvLmlkKS5zZXQoe1xyXG4gICAgbmFtZTogdXNlckluZm8ubmFtZSxcclxuICAgIGVtYWlsOiB1c2VySW5mby5lbWFpbCxcclxuICAgIHBpY3R1cmU6IHVzZXJJbmZvLnBpY3R1cmUsXHJcbiAgICBsb2dnZWRJbkF0OiBuZXcgRGF0ZSgpLFxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQXV0aFN1Y2Nlc3ModXNlckluZm8pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHtcclxuICAgICAgICAgICAgICAgICAgICB1c2VyRW1haWw6IHVzZXJJbmZvLmVtYWlsLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJJZDogdXNlckluZm8uaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0aFRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG4gICAgICAgICAgICAgICAgfSwgcmVzb2x2ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBoYW5kbGUgT0F1dGggc3VjY2VzczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgIGluaXRNYWluUGFnZSgpO1xyXG59KTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXRNYWluUGFnZSgpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgc2hvd1ZlcnNpb25JbmZvKCk7XHJcbiAgICAgICAgY29uc3QgdXNlckRhdGEgPSBhd2FpdCBmZXRjaFVzZXJEYXRhKCk7XHJcbiAgICAgICAgYXdhaXQgcmVmcmVzaEF1dGhVSSh1c2VyRGF0YSk7XHJcbiAgICAgICAgaWYgKHVzZXJEYXRhLnVzZXJFbWFpbCAmJiB1c2VyRGF0YS51c2VySWQpIHtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBiaW5kRXZlbnRIYW5kbGVycygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluaXRpYWxpemluZyBwYWdlOicsIGVycm9yKTtcclxuICAgICAgICBkaXNwbGF5RXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIGV4dGVuc2lvbiBwYWdlJyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3dWZXJzaW9uSW5mbygpIHtcclxuICAgIGNvbnN0IHZlcnNpb25FbGVtZW50ID0gJCgnI2V4dGVuc2lvbi12ZXJzaW9uJyk7XHJcbiAgICBpZiAodmVyc2lvbkVsZW1lbnQpIHtcclxuICAgICAgICBjb25zdCBtYW5pZmVzdCA9IGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCk7XHJcbiAgICAgICAgdmVyc2lvbkVsZW1lbnQudGV4dENvbnRlbnQgPSBgdiR7bWFuaWZlc3QudmVyc2lvbn1gO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRBcHBUaXRsZSgpIHtcclxuICAgIGNvbnN0IHRpdGxlRWxlbWVudCA9ICQoJyNhcHAtdGl0bGUnKTtcclxuICAgIGlmICh0aXRsZUVsZW1lbnQpIHtcclxuICAgICAgICAgICAgdGl0bGVFbGVtZW50LnRleHRDb250ZW50ID0gJ0R1cGVZYWsgRHVwbGljYXRlIFJlbW92ZXInO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRWZXJzaW9uU3RhdHVzKCkge1xyXG4gICAgc2V0QXBwVGl0bGUoKTtcclxuICAgIHNob3dWZXJzaW9uSW5mbygpO1xyXG5cclxufVxyXG5hc3luYyBmdW5jdGlvbiBmZXRjaFVzZXJEYXRhKCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFsndXNlckVtYWlsJywgJ3VzZXJJZCddLCAocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiByZWZyZXNoQXV0aFVJKHVzZXJJbmZvKSB7XHJcbiAgICBjb25zdCBhY2NvdW50U2VjdGlvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hY2NvdW50LXNlY3Rpb24nKTtcclxuXHJcbiAgICBpZiAodXNlckluZm8udXNlckVtYWlsICYmIHVzZXJJbmZvLnVzZXJJZCkge1xyXG4gICAgICAgIGFjY291bnRTZWN0aW9uLmlubmVySFRNTCA9IGJ1aWxkU2lnbmVkSW5WaWV3KHVzZXJJbmZvLnVzZXJFbWFpbCk7XHJcbiAgICAgICAgc2V0QXBwVGl0bGUoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYWNjb3VudFNlY3Rpb24uaW5uZXJIVE1MID0gYnVpbGRTaWduSW5WaWV3KCk7XHJcbiAgICAgICAgc2V0QXBwVGl0bGUoZmFsc2UpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBidWlsZFNpZ25lZEluVmlldyhlbWFpbCkge1xyXG4gICAgY29uc3QgYnV0dG9ucyA9IFtcclxuICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgaWQ9XCJvcGVuLXBob3Rvcy1idG5cIj5cclxuICAgICAgICAgICAg8J+TuCBPcGVuIEdvb2dsZSBQaG90b3NcclxuICAgICAgICA8L2J1dHRvbj5gXHJcbiAgICBdO1xyXG4gICAgYnV0dG9ucy5wdXNoKGA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1kYW5nZXJcIiBpZD1cInNpZ24tb3V0LWJ0blwiPlxyXG4gICAgICAgIPCfmqogU2lnbiBPdXRcclxuICAgIDwvYnV0dG9uPmApO1xyXG5cclxuICAgIHJldHVybiBgXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtaW5mb1wiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1kZXRhaWxzXCI+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1sYWJlbFwiPlNpZ25lZCBpbiBhczo8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWVtYWlsXCI+JHtlbWFpbH08L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWFjdGlvbnNcIj5cclxuICAgICAgICAgICAgICAgICR7YnV0dG9ucy5qb2luKCdcXG4gICAgICAgICAgICAgICAgJyl9XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgYDtcclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRTaWduSW5WaWV3KCkge1xyXG4gICAgcmV0dXJuIGBcclxuICAgICAgICA8ZGl2IGNsYXNzPVwic2lnbmluLWNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgICA8aDIgY2xhc3M9XCJzaWduaW4tdGl0bGVcIj5XZWxjb21lIHRvIER1cGVZYWsgRHVwbGljYXRlIFJlbW92ZXI8L2gyPlxyXG4gICAgICAgICAgICA8cCBjbGFzcz1cInNpZ25pbi1zdWJ0aXRsZVwiPlNpZ24gaW4gd2l0aCB5b3VyIEdvb2dsZSBhY2NvdW50IHRvIGdldCBzdGFydGVkPC9wPlxyXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5XCIgaWQ9XCJzaWduLWluLWJ0blwiPlxyXG4gICAgICAgICAgICAgICAg8J+UkCBTaWduIGluIHdpdGggR29vZ2xlXHJcbiAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgYDtcclxufVxyXG5cclxuZnVuY3Rpb24gYmluZEV2ZW50SGFuZGxlcnMoKSB7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNpZ24taW4tYnRuXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY2hyb21lLmlkZW50aXR5LmxhdW5jaFdlYkF1dGhGbG93KFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGBodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aD9jbGllbnRfaWQ9OTA0MDkzODAwMjI2LWdkc2IxN2w0MG0wY2xqc3RlbnI3bXV2aWlnczVxYTlrLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJnJlc3BvbnNlX3R5cGU9dG9rZW4mcmVkaXJlY3RfdXJpPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNocm9tZS5pZGVudGl0eS5nZXRSZWRpcmVjdFVSTCgncHJvdmlkZXJfY2InKSl9JnNjb3BlPXByb2ZpbGUgZW1haWxgLFxyXG4gICAgICAgICAgICAgICAgaW50ZXJhY3RpdmU6IHRydWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZnVuY3Rpb24gKHJlZGlyZWN0VXJsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkxvZ2luIGZhaWxlZDpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhuZXcgVVJMKHJlZGlyZWN0VXJsKS5oYXNoLnN1YnN0cmluZygxKSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IHBhcmFtcy5nZXQoXCJhY2Nlc3NfdG9rZW5cIik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBHb29nbGUgVXNlciBJbmZvIEFQSVxyXG4gICAgICAgICAgICAgICAgZmV0Y2goXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjIvdXNlcmluZm9cIiwge1xyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oYXN5bmMgdXNlckluZm8gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVzZXIgaW5mbzpcIiwgdXNlckluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVBdXRoU3VjY2Vzcyh1c2VySW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZVVzZXJJbkZpcmVzdG9yZSh1c2VySW5mbylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuXHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgc2lnbk91dEJ0biA9ICQoJyNzaWduLW91dC1idG4nKTtcclxuICAgIGlmIChzaWduT3V0QnRuLmxlbmd0aCkge1xyXG4gICAgICAgIHNpZ25PdXRCdG4ub24oJ2NsaWNrJywgb25Vc2VyU2lnbk91dCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgb3BlblBob3Rvc0J0biA9ICQoJyNvcGVuLXBob3Rvcy1idG4nKTtcclxuICAgIGlmIChvcGVuUGhvdG9zQnRuLmxlbmd0aCkge1xyXG4gICAgICAgIG9wZW5QaG90b3NCdG4ub24oJ2NsaWNrJywgb25PcGVuUGhvdG9zKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiBvblVzZXJTaWduSW4oKSB7XHJcbiAgICBjb25zdCBzaWduSW5CdG4gPSAkKCcjc2lnbi1pbi1idG4nKTtcclxuICAgIGlmIChzaWduSW5CdG4pIHtcclxuICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIHNpZ25JbkJ0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gT3BlbmluZyBHb29nbGUgT0F1dGguLi4nO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgICBhY3Rpb246ICdhdXRoZW50aWNhdGUnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICBpZiAoc2lnbkluQnRuKSB7XHJcbiAgICAgICAgICAgICAgICBzaWduSW5CdG4uaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+IENvbXBsZXRlIHNpZ24taW4gaW4gdGhlIG9wZW5lZCB0YWIuLi4nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRpc3BsYXlTdWNjZXNzKCdBdXRoZW50aWNhdGlvbiB0YWIgb3BlbmVkISBQbGVhc2UgY29tcGxldGUgc2lnbi1pbiBpbiB0aGUgbmV3IHRhYi4nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yIHx8ICdBdXRoZW50aWNhdGlvbiBmYWlsZWQnKTtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpZ24gaW4gZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRmFpbGVkIHRvIHN0YXJ0IGF1dGhlbnRpY2F0aW9uLiBQbGVhc2UgdHJ5IGFnYWluLicpO1xyXG4gICAgICAgIGlmIChzaWduSW5CdG4pIHtcclxuICAgICAgICAgICAgc2lnbkluQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNpZ25JbkJ0bi5pbm5lckhUTUwgPSAn8J+UkCBTaWduIGluIHdpdGggR29vZ2xlJztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG9uVXNlclNpZ25PdXQoKSB7XHJcbiAgICBjb25zdCBzaWduT3V0QnRuID0gJCgnI3NpZ24tb3V0LWJ0bicpO1xyXG4gICAgaWYgKHNpZ25PdXRCdG4pIHtcclxuICAgICAgICBzaWduT3V0QnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICBzaWduT3V0QnRuLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjwvZGl2PiBTaWduaW5nIG91dC4uLic7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5yZW1vdmUoW1xyXG4gICAgICAgICAgICAgICAgJ3VzZXJFbWFpbCcsXHJcbiAgICAgICAgICAgICAgICAndXNlcklkJyxcclxuICAgICAgICAgICAgXSwgcmVzb2x2ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYXdhaXQgcmVmcmVzaEF1dGhVSSh7fSk7XHJcbiAgICAgICAgYmluZEV2ZW50SGFuZGxlcnMoKTtcclxuICAgICAgICBzZXRBcHBUaXRsZShmYWxzZSk7XHJcblxyXG4gICAgICAgIGRpc3BsYXlTdWNjZXNzKCdTdWNjZXNzZnVsbHkgc2lnbmVkIG91dCEnKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignU2lnbiBvdXQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRmFpbGVkIHRvIHNpZ24gb3V0LiBQbGVhc2UgdHJ5IGFnYWluLicpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBjb25zdCBzaWduT3V0QnRuID0gJCgnI3NpZ24tb3V0LWJ0bicpO1xyXG4gICAgICAgIGlmIChzaWduT3V0QnRuKSB7XHJcbiAgICAgICAgICAgIHNpZ25PdXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2lnbk91dEJ0bi5pbm5lckhUTUwgPSAn8J+aqiBTaWduIE91dCc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbk9wZW5QaG90b3MoKSB7XHJcbiAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6ICdodHRwczovL3Bob3Rvcy5nb29nbGUuY29tJyB9KTtcclxufVxyXG5mdW5jdGlvbiBkaXNwbGF5U3VjY2VzcyhtZXNzYWdlKSB7XHJcbiAgICBkaXNwbGF5Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdzdWNjZXNzJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpc3BsYXlFcnJvcihtZXNzYWdlKSB7XHJcbiAgICBkaXNwbGF5Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdlcnJvcicpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNwbGF5Tm90aWZpY2F0aW9uKG1lc3NhZ2UsIHR5cGUgPSAnaW5mbycpIHtcclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgbm90aWZpY2F0aW9uLmNsYXNzTmFtZSA9IGBub3RpZmljYXRpb24gbm90aWZpY2F0aW9uLSR7dHlwZX1gO1xyXG4gICAgbm90aWZpY2F0aW9uLnRleHRDb250ZW50ID0gbWVzc2FnZTtcclxuXHJcbiAgICBPYmplY3QuYXNzaWduKG5vdGlmaWNhdGlvbi5zdHlsZSwge1xyXG4gICAgICAgIHBvc2l0aW9uOiAnZml4ZWQnLFxyXG4gICAgICAgIHRvcDogJzIwcHgnLFxyXG4gICAgICAgIHJpZ2h0OiAnMjBweCcsXHJcbiAgICAgICAgcGFkZGluZzogJzEycHggMjBweCcsXHJcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnOHB4JyxcclxuICAgICAgICBjb2xvcjogJ3doaXRlJyxcclxuICAgICAgICBmb250V2VpZ2h0OiAnNTAwJyxcclxuICAgICAgICB6SW5kZXg6ICcxMDAwMCcsXHJcbiAgICAgICAgdHJhbnNmb3JtOiAndHJhbnNsYXRlWCgxMDAlKScsXHJcbiAgICAgICAgdHJhbnNpdGlvbjogJ3RyYW5zZm9ybSAwLjNzIGVhc2UnLFxyXG4gICAgICAgIG1heFdpZHRoOiAnMzAwcHgnLFxyXG4gICAgICAgIHdvcmRXcmFwOiAnYnJlYWstd29yZCdcclxuICAgIH0pO1xyXG5cclxuICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICAgIGNhc2UgJ3N1Y2Nlc3MnOlxyXG4gICAgICAgICAgICBub3RpZmljYXRpb24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyMzNGE4NTMnO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlICdlcnJvcic6XHJcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnI2VhNDMzNSc7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzQyODVmNCc7XHJcbiAgICB9XHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbik7XHJcblxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDApJztcclxuICAgIH0sIDEwMCk7XHJcblxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDEwMCUpJztcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbi5wYXJlbnROb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBub3RpZmljYXRpb24ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub3RpZmljYXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMzAwKTtcclxuICAgIH0sIDMwMDApO1xyXG59XHJcbmNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgbmFtZXNwYWNlKSA9PiB7XHJcbiAgICBpZiAobmFtZXNwYWNlID09PSAnbG9jYWwnKSB7XHJcbiAgICAgICAgaWYgKGNoYW5nZXMudXNlckVtYWlsIHx8IGNoYW5nZXMudXNlcklkKSB7XHJcbiAgICAgICAgICAgIGZldGNoVXNlckRhdGEoKS50aGVuKGFzeW5jIHVzZXJEYXRhID0+IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHJlZnJlc2hBdXRoVUkodXNlckRhdGEpO1xyXG4gICAgICAgICAgICAgICAgYmluZEV2ZW50SGFuZGxlcnMoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuLy8gY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGFzeW5jIChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4vLyAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnYXV0aGVudGljYXRpb25Db21wbGV0ZScpIHtcclxuLy8gICAgICAgICBjb25zdCB1c2VyRGF0YSA9IGF3YWl0IGZldGNoVXNlckRhdGEoKTtcclxuLy8gICAgICAgICBhd2FpdCByZWZyZXNoQXV0aFVJKHVzZXJEYXRhKTtcclxuLy8gICAgICAgICBiaW5kRXZlbnRIYW5kbGVycygpO1xyXG4vLyAgICAgICAgIGlmICh1c2VyRGF0YS51c2VyRW1haWwgJiYgdXNlckRhdGEudXNlcklkKSB7XHJcbi8vICAgICAgICAgfVxyXG5cclxuLy8gICAgICAgICBkaXNwbGF5U3VjY2VzcygnQXV0aGVudGljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKTtcclxuXHJcbi8vICAgICAgICAgY29uc3Qgc2lnbkluQnRuID0gJCgnI3NpZ24taW4tYnRuJyk7XHJcbi8vICAgICAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4vLyAgICAgICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuLy8gICAgICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICfwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGUnO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuLy8gfSk7XHJcblxyXG52YXIgZXh0ZW5zaW9uUGFnZUNvcmUgPSB7XHJcbiAgICBhZGRFdmVudHM6IGZ1bmN0aW9uIChwYXJhbXMpIHtcclxuICAgICAgICAkKGRvY3VtZW50KS5vbihcImNsaWNrXCIsICcjc2lnbi1vdXQtYnRuJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIG9uVXNlclNpZ25PdXQoKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkKGRvY3VtZW50KS5vbihcImNsaWNrXCIsICcjb3Blbi1waG90b3MtYnRuJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIG9uT3BlblBob3RvcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XHJcbiAgICBleHRlbnNpb25QYWdlQ29yZS5hZGRFdmVudHMoKTtcclxufSkiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=