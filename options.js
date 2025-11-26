// options.js

document.addEventListener('DOMContentLoaded', () => {
    const subscribeButton = document.getElementById('subscribeButton');
    const accessTokenInput = document.getElementById('accessTokenInput');
    const saveTokenButton = document.getElementById('saveTokenButton');
    const statusMessage = document.getElementById('statusMessage');

    // REPLACE THIS WITH YOUR REAL STRIPE PAYMENT LINK
    const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/28EdR974P14c4s7gsLeZ208";

    // Handle Subscribe button click
    subscribeButton.addEventListener('click', () => {
        window.open(STRIPE_PAYMENT_LINK, '_blank');
    });

    // Load saved token on startup
    chrome.storage.sync.get(['subscriptionToken'], (result) => {
        if (result.subscriptionToken) {
            accessTokenInput.value = result.subscriptionToken;
            statusMessage.textContent = "Access token already saved. CharmPilot is unlocked on this browser.";
            statusMessage.style.color = "green";
        }
    });

    // Handle Save Token button click
    saveTokenButton.addEventListener('click', () => {
        const token = accessTokenInput.value.trim();

        if (!token) {
            statusMessage.textContent = "Please enter a valid token.";
            statusMessage.style.color = "red";
            return;
        }

        chrome.storage.sync.set({ subscriptionToken: token }, () => {
            statusMessage.textContent = "Access token saved. CharmPilot is unlocked on this browser.";
            statusMessage.style.color = "green";
        });
    });
});
