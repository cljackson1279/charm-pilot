// popup.js

// Placeholder for the backend URL. 
// In production, this would be your Vercel app URL, e.g., "https://your-app.vercel.app/api/generate"
// For local testing, we use localhost.
const API_URL = "http://localhost:3000/api/generate";

document.addEventListener('DOMContentLoaded', () => {
    const ppvInput = document.getElementById('ppv-menu');
    const personaRadios = document.getElementsByName('persona');
    const generateBtn = document.getElementById('generate-btn');
    const outputArea = document.getElementById('output-area');
    const subscriptionMsg = document.createElement('div');
    subscriptionMsg.style.color = 'red';
    subscriptionMsg.style.marginBottom = '10px';
    subscriptionMsg.style.display = 'none';
    document.body.insertBefore(subscriptionMsg, generateBtn);

    // Load saved settings and check subscription
    chrome.storage.sync.get(['ppvMenu', 'persona', 'subscriptionToken'], (result) => {
        if (result.ppvMenu) {
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
        const isSubscribed = result.subscriptionToken && result.subscriptionToken.trim().length > 0;
        if (!isSubscribed) {
            generateBtn.disabled = true;
            generateBtn.style.backgroundColor = '#ccc';
            generateBtn.style.cursor = 'not-allowed';
            subscriptionMsg.innerHTML = 'Subscribe to unlock CharmPilot. <a href="#" id="open-options">Open Settings</a>';
            subscriptionMsg.style.display = 'block';

            document.getElementById('open-options').addEventListener('click', (e) => {
                e.preventDefault();
                chrome.runtime.openOptionsPage();
            });
        }
    });

    // Save settings when changed
    ppvInput.addEventListener('input', () => {
        chrome.storage.sync.set({ ppvMenu: ppvInput.value });
    });

    for (const radio of personaRadios) {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                chrome.storage.sync.set({ persona: radio.value });
            }
        });
    }

    // Handle Generate Reply click
    generateBtn.addEventListener('click', () => {
        outputArea.innerText = "Generating...";
        generateBtn.disabled = true;

        // Get current settings
        const currentPPV = ppvInput.value;
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
            outputArea.innerText = "Typing...";
            const delay = Math.floor(Math.random() * 10000) + 5000; // 5000 to 15000 ms

            setTimeout(() => {
                outputArea.innerText = reply;

                // Show Heat Score if available
                if (heatScore !== undefined) {
                    const heatArea = document.getElementById('heat-score-area');
                    const scoreVal = document.getElementById('heat-score-val');
                    const suggVal = document.getElementById('ppv-suggestion-val');

                    scoreVal.innerText = heatScore;
                    suggVal.innerText = ppvSuggestion || "None";
                    heatArea.style.display = 'block';

                    // Color code score
                    if (heatScore >= 85) scoreVal.style.color = 'green';
                    else if (heatScore >= 50) scoreVal.style.color = 'orange';
                    else scoreVal.style.color = 'blue';
                }

                generateBtn.disabled = false;

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
            outputArea.innerText = "Error: " + error.message;
            generateBtn.disabled = false;
        }
    }
});
