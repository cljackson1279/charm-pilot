// popup.js

// Update this URL with your production Vercel project URL
const API_URL = "https://charm-pilot.vercel.app/api/generate";

document.addEventListener('DOMContentLoaded', () => {
    const ppvInput = document.getElementById('ppv-menu');
    const personaRadios = document.getElementsByName('persona');
    const generateButton = document.getElementById('generateReplyButton');
    const lockedMessage = document.getElementById('lockedMessage');
    const outputArea = document.getElementById('output-area');

    // If generateButton is null, log an error and return instead of throwing
    if (!generateButton) {
        console.error("CharmPilot: Generate Reply button not found in popup.html");
        return;
    }

    // Implement token gating using chrome.storage.sync
    chrome.storage.sync.get(['ppvMenu', 'persona', 'subscriptionToken'], (result) => {
        // Restore settings if elements exist
        if (ppvInput && result.ppvMenu) {
            ppvInput.value = result.ppvMenu;
        }
        if (result.persona) {
            for (const radio of personaRadios) {
                if (radio.value === result.persona) {
                    radio.checked = true;
                    break;
                }
            }
        }

        // Check subscription
        const token = result.subscriptionToken;
        if (token && token.trim() !== "") {
            // Token exists: Enable and clear message
            generateButton.disabled = false;
            if (lockedMessage) lockedMessage.textContent = "";
        } else {
            // No token: Keep disabled and show message
            generateButton.disabled = true;
            if (lockedMessage) lockedMessage.textContent = "CharmPilot is locked. Go to Settings → Subscription to start your 3-day trial and add your access token.";
        }
    });

    // Save settings when changed (Safely)
    if (ppvInput) {
        ppvInput.addEventListener('input', () => {
            chrome.storage.sync.set({ ppvMenu: ppvInput.value });
        });
    }

    for (const radio of personaRadios) {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                chrome.storage.sync.set({ persona: radio.value });
            }
        });
    }

    // Attach existing click handler
    generateButton.addEventListener('click', () => {
        if (outputArea) outputArea.innerText = "Generating...";
        generateButton.disabled = true;

        // Get current settings
        const currentPPV = ppvInput ? ppvInput.value : "";
        let currentPersona = 'flirty';
        for (const radio of personaRadios) {
            if (radio.checked) {
                currentPersona = radio.value;
                break;
            }
        }

        // Request messages from content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_MESSAGES" }, (response) => {
                    let messages = [];
                    if (chrome.runtime.lastError) {
                        console.log("Could not get messages:", chrome.runtime.lastError.message);
                    } else if (response && response.messages) {
                        messages = response.messages;
                    }

                    // Call backend
                    generateReply(messages, currentPersona, currentPPV);
                });
            }
        });
    });

    async function generateReply(messages, persona, ppvMenu) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    persona: persona,
                    ppvMenu: ppvMenu
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            // Handle both old (string) and new (object) response formats for backward compatibility during dev
            const reply = data.reply || (typeof data === 'string' ? data : "Error parsing reply");
            const heatScore = data.heatScore;
            const ppvSuggestion = data.ppvSuggestion;

            // Simulate human typing delay (5-15 seconds)
            if (outputArea) outputArea.innerText = "Typing...";
            const delay = Math.floor(Math.random() * 10000) + 5000; // 5000 to 15000 ms

            setTimeout(() => {
                if (outputArea) outputArea.innerText = reply;

                // Show Heat Score if available
                if (heatScore !== undefined) {
                    const heatArea = document.getElementById('heat-score-area');
                    const scoreVal = document.getElementById('heat-score-val');
                    const suggVal = document.getElementById('ppv-suggestion-val');

                    if (scoreVal) scoreVal.innerText = heatScore;
                    if (suggVal) suggVal.innerText = ppvSuggestion || "None";
                    if (heatArea) heatArea.style.display = 'block';

                    // Color code score
                    if (scoreVal) {
                        if (heatScore >= 85) scoreVal.style.color = 'green';
                        else if (heatScore >= 50) scoreVal.style.color = 'orange';
                        else scoreVal.style.color = 'blue';
                    }
                }

                generateButton.disabled = false;

                // Send to content script to insert
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: "INSERT_REPLY",
                            reply: reply
                        });
                    }
                });
            }, delay);

        } catch (error) {
            console.error("Generation failed:", error);
            if (outputArea) outputArea.innerText = "Error: " + error.message;
            generateButton.disabled = false;
        }
    }
});
