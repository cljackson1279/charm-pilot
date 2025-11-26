// api/generate.js
import OpenAI from 'openai';

// Initialize OpenAI client
// Note: In Vercel, environment variables are available automatically.
// For local testing, ensure OPENAI_API_KEY is set in .env or your environment.
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // Enable CORS for development/extension usage
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // api/generate.js
    import OpenAI from 'openai';

    // Initialize OpenAI client
    // Note: In Vercel, environment variables are available automatically.
    // For local testing, ensure OPENAI_API_KEY is set in .env or your environment.
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    export default async function handler(req, res) {
        // Enable CORS for development/extension usage
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        );

        // Handle OPTIONS request for CORS preflight
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { messages, persona, ppvMenu } = req.body;

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({ error: 'Missing or invalid messages' });
            }

            const lastMessage = messages[messages.length - 1].text || messages[messages.length - 1];

            // Construct a context string from the last few messages for the LLM to analyze
            const contextMessages = messages.map(m => `${m.role || 'unknown'}: ${m.text}`).join('\n');

            const systemPrompt = `You are a top 0.1% OnlyFans chatter. 
The creator's persona is: ${persona}.
The PPV menu is: ${ppvMenu}.

Task:
1. Analyze the conversation history (provided below) to estimate a "heatScore" (0-100) representing how engaged and ready to buy the fan is.
   - 85-100: Very engaged, ready to buy.
   - 50-84: Warm, tease and lightly upsell.
   - 0-49: Cold, focus on pure engagement.
2. Based on the heatScore and the PPV menu, select a "ppvSuggestion":
   - 85+: "Hard pitch" high-ticket item.
   - 50-84: Mid-range item.
   - <50: Low-ticket / intro / teaser.
3. Draft a 2-3 sentence reply that:
   - Acknowledges the fan's emotion.
   - Naturally segues to the suggested PPV upsell (if appropriate based on score).
   - Uses the persona's tone.
   - Is suggestive but safe (no explicit sexual content).

Return ONLY a JSON object with this structure:
{
  "reply": "The drafted reply text",
  "heatScore": 75,
  "ppvSuggestion": "The selected PPV offer"
}`;

            const userPrompt = `Conversation History:\n${contextMessages}\n\nFan's last message: "${lastMessage}"`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                max_tokens: 300,
            });

            const result = JSON.parse(completion.choices[0].message.content.trim());

            return res.status(200).json(result);
        } catch (error) {
            console.error('Error generating reply:', error);
            return res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
