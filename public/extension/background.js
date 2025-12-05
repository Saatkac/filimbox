// Video Player Helper - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Video Player Helper eklentisi yüklendi');
});

// Eklenti durumunu kontrol et
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkStatus') {
    sendResponse({ active: true, version: '1.0.0' });
  }
  return true;
});
