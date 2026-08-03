export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GROQ_API_KEY" });
  }

  try {
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const msg = (data && data.error && data.error.message) || "Groq API request failed";
      return res.status(groqRes.status).json({ error: msg });
    }

    const text =
      (data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content || ""
        : "");

    return res.status(200).json({ content: [{ text }] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to reach the Groq API" });
  }
}
