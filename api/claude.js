export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const msg = (data && data.error && data.error.message) || "Gemini API request failed";
      return res.status(geminiRes.status).json({ error: msg });
    }

    const text =
      (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts
          ? data.candidates[0].content.parts.map((p) => p.text || "").join("\n")
          : "");

    return res.status(200).json({ content: [{ text }] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to reach the Gemini API" });
  }
}
