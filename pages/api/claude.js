/**
 * McZEN Clinical Nutrition AI — Secure API Route
 *
 * This file runs ONLY on the server (Vercel / Node.js).
 * The ANTHROPIC_API_KEY is NEVER sent to the browser.
 * The frontend calls /api/claude → this file → Anthropic API.
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check that the API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'sk-ant-your-key-here') {
    return res.status(500).json({
      error: 'API key not configured. Create a .env.local file with your ANTHROPIC_API_KEY. See .env.local.example for instructions.',
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
