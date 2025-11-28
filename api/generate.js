import OpenAI from 'openai';

// Initialize OpenAI client
// Ensure process.env.OPENAI_API_KEY is set in Vercel
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
        const { messages, persona, ppvMenu } = req.body;

        // Validate messages
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Missing or invalid messages array' });
        }

        // Extract last message and build context
        // Handle both object {role, text} and string formats if necessary, though MVP usually sends objects
        const lastMessageObj = messages[messages.length - 1];
        const lastMessageText = typeof lastMessageObj === 'string' ? lastMessageObj : (lastMessageObj.text || lastMessageObj.content || '');

        // Simple context builder
        const contextMessages = messages.map(m => {
            const role = m.role || 'unknown';
            const text = m.text || m.content || '';
            return `${role}: ${text}`;
        }).join('\n');

        const systemPrompt = `You are a top 0.1% OnlyFans chatter. 
The creator's persona is: ${persona || 'flirty'}.
The PPV menu is: ${ppvMenu || 'None provided'}.

Task:
1. Analyze the conversation history to estimate a "heatScore" (0-100).
2. Select a "ppvSuggestion" based on the score and menu.
3. Draft a 2-3 sentence reply that is suggestive but safe, acknowledging the fan's emotion and segueing to the upsell if appropriate.

Return ONLY a JSON object:
{
  "reply": "The drafted reply text",
  "heatScore": 75,
  "ppvSuggestion": "The selected PPV offer"
}`;

        const userPrompt = `Conversation History:\n${contextMessages}\n\nFan's last message: "${lastMessageText}"`;

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            max_tokens: 300,
        });

        const content = completion.choices[0].message.content;
        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse OpenAI JSON response", content);
            // Fallback if JSON parsing fails
            result = {
                reply: content,
                heatScore: 50,
                ppvSuggestion: "Check menu"
            };
        }

        // Ensure default fields if missing
        const finalResponse = {
            reply: result.reply || "Hey there! 😘",
            heatScore: result.heatScore || 50,
            ppvSuggestion: result.ppvSuggestion || (ppvMenu ? "Check out my latest video!" : "None")
        };

        return res.status(200).json(finalResponse);

    } catch (error) {
        console.error('Error generating reply:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
