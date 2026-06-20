export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return res.status(500).json({ error: 'API key not configured.' });
  }
  try {
    const { system, messages, max_tokens } = req.body;

    // Merge system prompt into first user message
    const contents = messages.map((m, i) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: (i === 0 && system) ? `${system}\n\n${m.content}` : m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: max_tokens || 1000, temperature: 0.7 },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
