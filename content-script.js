// content-script.js

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "REQUEST_MESSAGES") {
        // Scrape the last 5 text messages
        const messages = scrapeMessages();
        sendResponse({ messages: messages });
    } else if (request.type === "INSERT_REPLY") {
        // Insert the generated reply into the message box
        insertReply(request.reply);
    }
    return true; // Keep the message channel open for async response
});

function scrapeMessages() {
    const messages = [];
    // Try multiple selectors to find message elements
    // These are common selectors, but might need adjustment for specific sites
    const selectors = [
        '[data-testid="message-text"]',
        '.message',
        '.message-text',
        'p',
        'div[role="textbox"]' // Sometimes messages are in textboxes? Unlikely for history, but good fallback
    ];

    let elements = [];
    for (const selector of selectors) {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) break;
    }

    // Get the last 5 messages
    const startIndex = Math.max(0, elements.length - 5);
    for (let i = startIndex; i < elements.length; i++) {
        const text = elements[i].innerText.trim();
        if (text) {
            messages.push(text);
        }
    }

    return messages;
}

function insertReply(replyText) {
    // Find the input field
    const inputSelectors = [
        'textarea',
        'input[type="text"]',
        '[contenteditable="true"]',
        'div[role="textbox"]'
    ];

    let inputField = null;
    for (const selector of inputSelectors) {
        inputField = document.querySelector(selector);
        if (inputField) break;
    }

    if (inputField) {
        inputField.focus();

        // Handle contenteditable vs value
        if (inputField.isContentEditable) {
            inputField.innerText = replyText;
        } else {
            inputField.value = replyText;
        }

        // Dispatch events to trigger site logic (e.g., enable send button)
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        inputField.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        console.error("CharmPilot: Could not find message input field.");
    }
}
