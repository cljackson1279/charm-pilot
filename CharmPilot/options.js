// options.js

document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('token-input');
    const saveBtn = document.getElementById('save-token-btn');
    const statusMsg = document.getElementById('status-msg');

    // Load saved token
    chrome.storage.sync.get(['subscriptionToken'], (result) => {
        if (result.subscriptionToken) {
            tokenInput.value = result.subscriptionToken;
        }
    });
