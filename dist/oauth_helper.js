/******/ (() => { // webpackBootstrap
/*!********************************!*\
  !*** ./src/js/oauth-helper.js ***!
  \********************************/

// class OAuthHelper {
//     async signOut() {
//         try {
//             await new Promise((resolve) => {
//                 chrome.storage.local.remove(['userEmail', 'userId', 'authTimestamp'], resolve);
//             });

//             return {
//                 success: true
//             };

//         } catch (error) {
//             console.error('Sign out failed:', error);
//             throw error;
//         }
//     }

//     sleep(ms) {
//         return new Promise(resolve => setTimeout(resolve, ms));
//     }
// }

// export default OAuthHelper;

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2F1dGhfaGVscGVyLmpzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7QUFDaEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vbGF0ZXN0Ly4vc3JjL2pzL29hdXRoLWhlbHBlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcclxuLy8gY2xhc3MgT0F1dGhIZWxwZXIge1xyXG4vLyAgICAgYXN5bmMgc2lnbk91dCgpIHtcclxuLy8gICAgICAgICB0cnkge1xyXG4vLyAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4vLyAgICAgICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKFsndXNlckVtYWlsJywgJ3VzZXJJZCcsICdhdXRoVGltZXN0YW1wJ10sIHJlc29sdmUpO1xyXG4vLyAgICAgICAgICAgICB9KTtcclxuXHJcbi8vICAgICAgICAgICAgIHJldHVybiB7XHJcbi8vICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlXHJcbi8vICAgICAgICAgICAgIH07XHJcblxyXG4vLyAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbi8vICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpZ24gb3V0IGZhaWxlZDonLCBlcnJvcik7XHJcbi8vICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgIH1cclxuXHJcbi8vICAgICBzbGVlcChtcykge1xyXG4vLyAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuLy8gICAgIH1cclxuLy8gfVxyXG5cclxuLy8gZXhwb3J0IGRlZmF1bHQgT0F1dGhIZWxwZXI7XHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==