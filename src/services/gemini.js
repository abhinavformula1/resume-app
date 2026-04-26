'use strict';

const config = require('../config');

/**
 * Calls Gemini Flash to generate a 2-sentence professional meeting summary.
 * @param {object} answers - { name, company, role, contractType, urgency, slot }
 * @returns {Promise<string>} summary text
 */
async function summariseConversation(answers) {
  const { name, company, role, contractType, urgency, slot } = answers;

  const prompt = `You are writing a professional meeting confirmation summary.
Given the following hiring inquiry details:
- Name: ${name}
- Company: ${company}
- Role: ${role}
- Position type: ${contractType}
- Hiring urgency: ${urgency}
- Scheduled slot: ${slot}

Write exactly 2 concise professional sentences confirming the meeting and summarising the hiring intent.
No filler phrases, no emojis, no bullet points. Plain text only.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${config.gemini.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

module.exports = { summariseConversation };
