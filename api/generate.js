import OpenAI from 'openai';

// Initialize OpenAI client
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check for API Key
    if (!process.env.OPENAI_API_KEY) {
        console.error("Missing OPENAI_API_KEY environment variable");
        return res.status(500).json({ error: 'Server Configuration Error: Missing API Key' });
    }

    try {
        // 2) BODY PARSING AND VALIDATION
        const { messages, persona, ppvMenu } = req.body || {};

        // Define a safeMessages array
        const safeMessages = Array.isArray(messages) ? messages : [];

        // 3) OPENAI CALL
        // Build the chat messages for OpenAI
        const lastMessage = safeMessages.length > 0
            ? (safeMessages[safeMessages.length - 1].text || safeMessages[safeMessages.length - 1] || "The fan sent a message in chat.")
            : "The fan sent a message in chat.";

        const personaSafe = persona || "Flirty";
        const ppvMenuSafe = ppvMenu || "Offer a $5 intro video and a $25 premium clip.";

        const systemPrompt = `
You are a top 0.1% OnlyFans chatter. The fan said: "${lastMessage}".
The creator's persona is ${personaSafe}. Their PPV menu is: ${ppvMenuSafe}.
Draft a 2–3 sentence reply that:
1) Acknowledges the fan's emotion,
2) Naturally segues to a PPV upsell from their menu,
3) Uses their persona's tone.
Return ONLY the reply text.
`.trim();

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt }
            ]
        });

        const reply = completion.choices[0]?.message?.content?.trim() || "";

        // For now, compute placeholders
        const heatScore = 75; // simple placeholder
        const ppvSuggestion = "Suggest a $5 intro video."; // simple placeholder

        // Return JSON response
        return res.status(200).json({
            reply,
            heatScore,
            ppvSuggestion
        });

    } catch (error) {
        // 4) ERROR HANDLING
        console.error("Error in /api/generate:", error);
        return res.status(500).json({ error: error.message || "Server error" });
    }
}
