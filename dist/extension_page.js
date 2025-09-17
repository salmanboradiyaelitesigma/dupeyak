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
            <p class="signin-subtitle">Sign in with your Google account to get started, buy PRO or restore your license</p>
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
                'isPaidVersion',
                'lastPaidStatusCheck',
                'paymentData'
            ], resolve);
        });
        await refreshAuthUI({});
        bindEventHandlers();
        setAppTitle(false);
        // notifyContentScript();

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
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'authenticationComplete') {
        const userData = await fetchUserData();
        await refreshAuthUI(userData);
        bindEventHandlers();
        if (userData.userEmail && userData.userId) {
        }

        displaySuccess('Authentication completed successfully!');

        const signInBtn = $('#sign-in-btn');
        if (signInBtn) {
            signInBtn.disabled = false;
            signInBtn.innerHTML = '🔐 Sign in with Google';
        }
    }
});

// function notifyContentScript() {
//     chrome.tabs.query({}, (tabs) => {
//         tabs.forEach(tab => {
//             if (tab.url && tab.url.includes('photos.google.com')) {
//                 chrome.tabs.sendMessage(tab.id, {
//                     action: 'paymentStatusUpdated'
//                 }).catch(() => {
//                 });
//             }
//         });
//     });
// } 

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0EsMkJBQTJCO0FBQzNCO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CO0FBQ3BCLG9CQUFvQjtBQUNwQjtBQUNBLFlBQVk7QUFDWixRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQyxDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vbGF0ZXN0Ly4vc3JjL2pzL3Rvb2wtcGFnZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBmaXJlYmFzZUNvbmZpZyA9IHtcclxuICBhcGlLZXk6IFwiQUl6YVN5Q0M2U2lsQnNkWWd0SlZMMkxHTGlld2hKWE1hTnFNcldJXCIsXHJcbiAgYXV0aERvbWFpbjogXCJkdXBleWFrdGVzdC5maXJlYmFzZWFwcC5jb21cIixcclxuICBwcm9qZWN0SWQ6IFwiZHVwZXlha3Rlc3RcIixcclxuICBzdG9yYWdlQnVja2V0OiBcImR1cGV5YWt0ZXN0LmZpcmViYXNlc3RvcmFnZS5hcHBcIixcclxuICBtZXNzYWdpbmdTZW5kZXJJZDogXCI4MjA5OTA0MDMyMDRcIixcclxuICBhcHBJZDogXCIxOjgyMDk5MDQwMzIwNDp3ZWI6MmE4NTBjOTVkOWQxZTM4NDhlZDhkMVwiLFxyXG4gIG1lYXN1cmVtZW50SWQ6IFwiRy05UjUzU0RFMUhZXCJcclxufTtcclxuXHJcblxyXG5jb25zdCBhcHAgPSBmaXJlYmFzZS5pbml0aWFsaXplQXBwKGZpcmViYXNlQ29uZmlnKTtcclxuY29uc3QgYXV0aCA9IGZpcmViYXNlLmF1dGgoKTtcclxuY29uc3QgZGIgPSBmaXJlYmFzZS5maXJlc3RvcmUoKTtcclxuY29uc3Qgc2V0RG9jID0gZmlyZWJhc2UuZmlyZXN0b3JlKCk7XHJcbmNvbnN0IGRvYyA9IGZpcmViYXNlLmZpcmVzdG9yZSgpO1xyXG5cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHN0b3JlVXNlckluRmlyZXN0b3JlKHVzZXJJbmZvKSB7XHJcbiAgICAgcmV0dXJuIGRiLmNvbGxlY3Rpb24oXCJ1c2Vyc1wiKS5kb2ModXNlckluZm8uaWQpLnNldCh7XHJcbiAgICBuYW1lOiB1c2VySW5mby5uYW1lLFxyXG4gICAgZW1haWw6IHVzZXJJbmZvLmVtYWlsLFxyXG4gICAgcGljdHVyZTogdXNlckluZm8ucGljdHVyZSxcclxuICAgIGxvZ2dlZEluQXQ6IG5ldyBEYXRlKCksXHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVBdXRoU3VjY2Vzcyh1c2VySW5mbykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJFbWFpbDogdXNlckluZm8uZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICAgdXNlcklkOiB1c2VySW5mby5pZCxcclxuICAgICAgICAgICAgICAgICAgICBhdXRoVGltZXN0YW1wOiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9LCByZXNvbHZlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGhhbmRsZSBPQXV0aCBzdWNjZXNzOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24gKCkge1xyXG4gICAgaW5pdE1haW5QYWdlKCk7XHJcbn0pO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdE1haW5QYWdlKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBzaG93VmVyc2lvbkluZm8oKTtcclxuICAgICAgICBjb25zdCB1c2VyRGF0YSA9IGF3YWl0IGZldGNoVXNlckRhdGEoKTtcclxuICAgICAgICBhd2FpdCByZWZyZXNoQXV0aFVJKHVzZXJEYXRhKTtcclxuICAgICAgICBpZiAodXNlckRhdGEudXNlckVtYWlsICYmIHVzZXJEYXRhLnVzZXJJZCkge1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGJpbmRFdmVudEhhbmRsZXJzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaW5pdGlhbGl6aW5nIHBhZ2U6JywgZXJyb3IpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgZXh0ZW5zaW9uIHBhZ2UnKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2hvd1ZlcnNpb25JbmZvKCkge1xyXG4gICAgY29uc3QgdmVyc2lvbkVsZW1lbnQgPSAkKCcjZXh0ZW5zaW9uLXZlcnNpb24nKTtcclxuICAgIGlmICh2ZXJzaW9uRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IG1hbmlmZXN0ID0gY2hyb21lLnJ1bnRpbWUuZ2V0TWFuaWZlc3QoKTtcclxuICAgICAgICB2ZXJzaW9uRWxlbWVudC50ZXh0Q29udGVudCA9IGB2JHttYW5pZmVzdC52ZXJzaW9ufWA7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldEFwcFRpdGxlKCkge1xyXG4gICAgY29uc3QgdGl0bGVFbGVtZW50ID0gJCgnI2FwcC10aXRsZScpO1xyXG4gICAgaWYgKHRpdGxlRWxlbWVudCkge1xyXG4gICAgICAgICAgICB0aXRsZUVsZW1lbnQudGV4dENvbnRlbnQgPSAnRHVwZVlhayBEdXBsaWNhdGUgUmVtb3Zlcic7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldFZlcnNpb25TdGF0dXMoKSB7XHJcbiAgICBzZXRBcHBUaXRsZSgpO1xyXG4gICAgc2hvd1ZlcnNpb25JbmZvKCk7XHJcblxyXG59XHJcbmFzeW5jIGZ1bmN0aW9uIGZldGNoVXNlckRhdGEoKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoWyd1c2VyRW1haWwnLCAndXNlcklkJ10sIChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHJlZnJlc2hBdXRoVUkodXNlckluZm8pIHtcclxuICAgIGNvbnN0IGFjY291bnRTZWN0aW9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFjY291bnQtc2VjdGlvbicpO1xyXG5cclxuICAgIGlmICh1c2VySW5mby51c2VyRW1haWwgJiYgdXNlckluZm8udXNlcklkKSB7XHJcbiAgICAgICAgYWNjb3VudFNlY3Rpb24uaW5uZXJIVE1MID0gYnVpbGRTaWduZWRJblZpZXcodXNlckluZm8udXNlckVtYWlsKTtcclxuICAgICAgICBzZXRBcHBUaXRsZSgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBhY2NvdW50U2VjdGlvbi5pbm5lckhUTUwgPSBidWlsZFNpZ25JblZpZXcoKTtcclxuICAgICAgICBzZXRBcHBUaXRsZShmYWxzZSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJ1aWxkU2lnbmVkSW5WaWV3KGVtYWlsKSB7XHJcbiAgICBjb25zdCBidXR0b25zID0gW1xyXG4gICAgICAgIGA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBpZD1cIm9wZW4tcGhvdG9zLWJ0blwiPlxyXG4gICAgICAgICAgICDwn5O4IE9wZW4gR29vZ2xlIFBob3Rvc1xyXG4gICAgICAgIDwvYnV0dG9uPmBcclxuICAgIF07XHJcbiAgICBidXR0b25zLnB1c2goYDxidXR0b24gY2xhc3M9XCJidG4gYnRuLWRhbmdlclwiIGlkPVwic2lnbi1vdXQtYnRuXCI+XHJcbiAgICAgICAg8J+aqiBTaWduIE91dFxyXG4gICAgPC9idXR0b24+YCk7XHJcblxyXG4gICAgcmV0dXJuIGBcclxuICAgICAgICA8ZGl2IGNsYXNzPVwiYWNjb3VudC1pbmZvXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWRldGFpbHNcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhY2NvdW50LWxhYmVsXCI+U2lnbmVkIGluIGFzOjwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtZW1haWxcIj4ke2VtYWlsfTwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjY291bnQtYWN0aW9uc1wiPlxyXG4gICAgICAgICAgICAgICAgJHtidXR0b25zLmpvaW4oJ1xcbiAgICAgICAgICAgICAgICAnKX1cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICBgO1xyXG59XHJcblxyXG5mdW5jdGlvbiBidWlsZFNpZ25JblZpZXcoKSB7XHJcbiAgICByZXR1cm4gYFxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJzaWduaW4tY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgIDxoMiBjbGFzcz1cInNpZ25pbi10aXRsZVwiPldlbGNvbWUgdG8gRHVwZVlhayBEdXBsaWNhdGUgUmVtb3ZlcjwvaDI+XHJcbiAgICAgICAgICAgIDxwIGNsYXNzPVwic2lnbmluLXN1YnRpdGxlXCI+U2lnbiBpbiB3aXRoIHlvdXIgR29vZ2xlIGFjY291bnQgdG8gZ2V0IHN0YXJ0ZWQsIGJ1eSBQUk8gb3IgcmVzdG9yZSB5b3VyIGxpY2Vuc2U8L3A+XHJcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXByaW1hcnlcIiBpZD1cInNpZ24taW4tYnRuXCI+XHJcbiAgICAgICAgICAgICAgICDwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGVcclxuICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICBgO1xyXG59XHJcblxyXG5mdW5jdGlvbiBiaW5kRXZlbnRIYW5kbGVycygpIHtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2lnbi1pbi1idG5cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICBjaHJvbWUuaWRlbnRpdHkubGF1bmNoV2ViQXV0aEZsb3coXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHVybDogYGh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoP2NsaWVudF9pZD05MDQwOTM4MDAyMjYtZ2RzYjE3bDQwbTBjbGpzdGVucjdtdXZpaWdzNXFhOWsuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20mcmVzcG9uc2VfdHlwZT10b2tlbiZyZWRpcmVjdF91cmk9JHtlbmNvZGVVUklDb21wb25lbnQoY2hyb21lLmlkZW50aXR5LmdldFJlZGlyZWN0VVJMKCdwcm92aWRlcl9jYicpKX0mc2NvcGU9cHJvZmlsZSBlbWFpbGAsXHJcbiAgICAgICAgICAgICAgICBpbnRlcmFjdGl2ZTogdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmdW5jdGlvbiAocmVkaXJlY3RVcmwpIHtcclxuICAgICAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTG9naW4gZmFpbGVkOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKG5ldyBVUkwocmVkaXJlY3RVcmwpLmhhc2guc3Vic3RyaW5nKDEpKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gcGFyYW1zLmdldChcImFjY2Vzc190b2tlblwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBDYWxsIEdvb2dsZSBVc2VyIEluZm8gQVBJXHJcbiAgICAgICAgICAgICAgICBmZXRjaChcImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92Mi91c2VyaW5mb1wiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YWNjZXNzVG9rZW59YCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihhc3luYyB1c2VySW5mbyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVXNlciBpbmZvOlwiLCB1c2VySW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZUF1dGhTdWNjZXNzKHVzZXJJbmZvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlVXNlckluRmlyZXN0b3JlKHVzZXJJbmZvKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG5cclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBzaWduT3V0QnRuID0gJCgnI3NpZ24tb3V0LWJ0bicpO1xyXG4gICAgaWYgKHNpZ25PdXRCdG4ubGVuZ3RoKSB7XHJcbiAgICAgICAgc2lnbk91dEJ0bi5vbignY2xpY2snLCBvblVzZXJTaWduT3V0KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBvcGVuUGhvdG9zQnRuID0gJCgnI29wZW4tcGhvdG9zLWJ0bicpO1xyXG4gICAgaWYgKG9wZW5QaG90b3NCdG4ubGVuZ3RoKSB7XHJcbiAgICAgICAgb3BlblBob3Rvc0J0bi5vbignY2xpY2snLCBvbk9wZW5QaG90b3MpO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIG9uVXNlclNpZ25JbigpIHtcclxuICAgIGNvbnN0IHNpZ25JbkJ0biA9ICQoJyNzaWduLWluLWJ0bicpO1xyXG4gICAgaWYgKHNpZ25JbkJ0bikge1xyXG4gICAgICAgIHNpZ25JbkJ0bi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjwvZGl2PiBPcGVuaW5nIEdvb2dsZSBPQXV0aC4uLic7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgICAgICAgIGFjdGlvbjogJ2F1dGhlbnRpY2F0ZSdcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgIGlmIChzaWduSW5CdG4pIHtcclxuICAgICAgICAgICAgICAgIHNpZ25JbkJ0bi5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInNwaW5uZXJcIj48L2Rpdj4gQ29tcGxldGUgc2lnbi1pbiBpbiB0aGUgb3BlbmVkIHRhYi4uLic7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGlzcGxheVN1Y2Nlc3MoJ0F1dGhlbnRpY2F0aW9uIHRhYiBvcGVuZWQhIFBsZWFzZSBjb21wbGV0ZSBzaWduLWluIGluIHRoZSBuZXcgdGFiLicpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZXN1bHQuZXJyb3IgfHwgJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCcpO1xyXG4gICAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignU2lnbiBpbiBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgZGlzcGxheUVycm9yKCdGYWlsZWQgdG8gc3RhcnQgYXV0aGVudGljYXRpb24uIFBsZWFzZSB0cnkgYWdhaW4uJyk7XHJcbiAgICAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4gICAgICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICfwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGUnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gb25Vc2VyU2lnbk91dCgpIHtcclxuICAgIGNvbnN0IHNpZ25PdXRCdG4gPSAkKCcjc2lnbi1vdXQtYnRuJyk7XHJcbiAgICBpZiAoc2lnbk91dEJ0bikge1xyXG4gICAgICAgIHNpZ25PdXRCdG4uZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIHNpZ25PdXRCdG4uaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzcGlubmVyXCI+PC9kaXY+IFNpZ25pbmcgb3V0Li4uJztcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShbXHJcbiAgICAgICAgICAgICAgICAndXNlckVtYWlsJyxcclxuICAgICAgICAgICAgICAgICd1c2VySWQnLFxyXG4gICAgICAgICAgICAgICAgJ2lzUGFpZFZlcnNpb24nLFxyXG4gICAgICAgICAgICAgICAgJ2xhc3RQYWlkU3RhdHVzQ2hlY2snLFxyXG4gICAgICAgICAgICAgICAgJ3BheW1lbnREYXRhJ1xyXG4gICAgICAgICAgICBdLCByZXNvbHZlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBhd2FpdCByZWZyZXNoQXV0aFVJKHt9KTtcclxuICAgICAgICBiaW5kRXZlbnRIYW5kbGVycygpO1xyXG4gICAgICAgIHNldEFwcFRpdGxlKGZhbHNlKTtcclxuICAgICAgICAvLyBub3RpZnlDb250ZW50U2NyaXB0KCk7XHJcblxyXG4gICAgICAgIGRpc3BsYXlTdWNjZXNzKCdTdWNjZXNzZnVsbHkgc2lnbmVkIG91dCEnKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignU2lnbiBvdXQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRmFpbGVkIHRvIHNpZ24gb3V0LiBQbGVhc2UgdHJ5IGFnYWluLicpO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBjb25zdCBzaWduT3V0QnRuID0gJCgnI3NpZ24tb3V0LWJ0bicpO1xyXG4gICAgICAgIGlmIChzaWduT3V0QnRuKSB7XHJcbiAgICAgICAgICAgIHNpZ25PdXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2lnbk91dEJ0bi5pbm5lckhUTUwgPSAn8J+aqiBTaWduIE91dCc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbk9wZW5QaG90b3MoKSB7XHJcbiAgICBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6ICdodHRwczovL3Bob3Rvcy5nb29nbGUuY29tJyB9KTtcclxufVxyXG5mdW5jdGlvbiBkaXNwbGF5U3VjY2VzcyhtZXNzYWdlKSB7XHJcbiAgICBkaXNwbGF5Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdzdWNjZXNzJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpc3BsYXlFcnJvcihtZXNzYWdlKSB7XHJcbiAgICBkaXNwbGF5Tm90aWZpY2F0aW9uKG1lc3NhZ2UsICdlcnJvcicpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNwbGF5Tm90aWZpY2F0aW9uKG1lc3NhZ2UsIHR5cGUgPSAnaW5mbycpIHtcclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgbm90aWZpY2F0aW9uLmNsYXNzTmFtZSA9IGBub3RpZmljYXRpb24gbm90aWZpY2F0aW9uLSR7dHlwZX1gO1xyXG4gICAgbm90aWZpY2F0aW9uLnRleHRDb250ZW50ID0gbWVzc2FnZTtcclxuXHJcbiAgICBPYmplY3QuYXNzaWduKG5vdGlmaWNhdGlvbi5zdHlsZSwge1xyXG4gICAgICAgIHBvc2l0aW9uOiAnZml4ZWQnLFxyXG4gICAgICAgIHRvcDogJzIwcHgnLFxyXG4gICAgICAgIHJpZ2h0OiAnMjBweCcsXHJcbiAgICAgICAgcGFkZGluZzogJzEycHggMjBweCcsXHJcbiAgICAgICAgYm9yZGVyUmFkaXVzOiAnOHB4JyxcclxuICAgICAgICBjb2xvcjogJ3doaXRlJyxcclxuICAgICAgICBmb250V2VpZ2h0OiAnNTAwJyxcclxuICAgICAgICB6SW5kZXg6ICcxMDAwMCcsXHJcbiAgICAgICAgdHJhbnNmb3JtOiAndHJhbnNsYXRlWCgxMDAlKScsXHJcbiAgICAgICAgdHJhbnNpdGlvbjogJ3RyYW5zZm9ybSAwLjNzIGVhc2UnLFxyXG4gICAgICAgIG1heFdpZHRoOiAnMzAwcHgnLFxyXG4gICAgICAgIHdvcmRXcmFwOiAnYnJlYWstd29yZCdcclxuICAgIH0pO1xyXG5cclxuICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICAgIGNhc2UgJ3N1Y2Nlc3MnOlxyXG4gICAgICAgICAgICBub3RpZmljYXRpb24uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyMzNGE4NTMnO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlICdlcnJvcic6XHJcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnI2VhNDMzNSc7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzQyODVmNCc7XHJcbiAgICB9XHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbik7XHJcblxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDApJztcclxuICAgIH0sIDEwMCk7XHJcblxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgbm90aWZpY2F0aW9uLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGVYKDEwMCUpJztcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKG5vdGlmaWNhdGlvbi5wYXJlbnROb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBub3RpZmljYXRpb24ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub3RpZmljYXRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMzAwKTtcclxuICAgIH0sIDMwMDApO1xyXG59XHJcbmNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgbmFtZXNwYWNlKSA9PiB7XHJcbiAgICBpZiAobmFtZXNwYWNlID09PSAnbG9jYWwnKSB7XHJcbiAgICAgICAgaWYgKGNoYW5nZXMudXNlckVtYWlsIHx8IGNoYW5nZXMudXNlcklkKSB7XHJcbiAgICAgICAgICAgIGZldGNoVXNlckRhdGEoKS50aGVuKGFzeW5jIHVzZXJEYXRhID0+IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHJlZnJlc2hBdXRoVUkodXNlckRhdGEpO1xyXG4gICAgICAgICAgICAgICAgYmluZEV2ZW50SGFuZGxlcnMoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGFzeW5jIChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4gICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSAnYXV0aGVudGljYXRpb25Db21wbGV0ZScpIHtcclxuICAgICAgICBjb25zdCB1c2VyRGF0YSA9IGF3YWl0IGZldGNoVXNlckRhdGEoKTtcclxuICAgICAgICBhd2FpdCByZWZyZXNoQXV0aFVJKHVzZXJEYXRhKTtcclxuICAgICAgICBiaW5kRXZlbnRIYW5kbGVycygpO1xyXG4gICAgICAgIGlmICh1c2VyRGF0YS51c2VyRW1haWwgJiYgdXNlckRhdGEudXNlcklkKSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkaXNwbGF5U3VjY2VzcygnQXV0aGVudGljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2lnbkluQnRuID0gJCgnI3NpZ24taW4tYnRuJyk7XHJcbiAgICAgICAgaWYgKHNpZ25JbkJ0bikge1xyXG4gICAgICAgICAgICBzaWduSW5CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2lnbkluQnRuLmlubmVySFRNTCA9ICfwn5SQIFNpZ24gaW4gd2l0aCBHb29nbGUnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG4vLyBmdW5jdGlvbiBub3RpZnlDb250ZW50U2NyaXB0KCkge1xyXG4vLyAgICAgY2hyb21lLnRhYnMucXVlcnkoe30sICh0YWJzKSA9PiB7XHJcbi8vICAgICAgICAgdGFicy5mb3JFYWNoKHRhYiA9PiB7XHJcbi8vICAgICAgICAgICAgIGlmICh0YWIudXJsICYmIHRhYi51cmwuaW5jbHVkZXMoJ3Bob3Rvcy5nb29nbGUuY29tJykpIHtcclxuLy8gICAgICAgICAgICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwge1xyXG4vLyAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ3BheW1lbnRTdGF0dXNVcGRhdGVkJ1xyXG4vLyAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xyXG4vLyAgICAgICAgICAgICAgICAgfSk7XHJcbi8vICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICB9KTtcclxuLy8gICAgIH0pO1xyXG4vLyB9IFxyXG5cclxudmFyIGV4dGVuc2lvblBhZ2VDb3JlID0ge1xyXG4gICAgYWRkRXZlbnRzOiBmdW5jdGlvbiAocGFyYW1zKSB7XHJcbiAgICAgICAgJChkb2N1bWVudCkub24oXCJjbGlja1wiLCAnI3NpZ24tb3V0LWJ0bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBvblVzZXJTaWduT3V0KClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJChkb2N1bWVudCkub24oXCJjbGlja1wiLCAnI29wZW4tcGhvdG9zLWJ0bicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBvbk9wZW5QaG90b3MoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xyXG4gICAgZXh0ZW5zaW9uUGFnZUNvcmUuYWRkRXZlbnRzKCk7XHJcbn0pIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9