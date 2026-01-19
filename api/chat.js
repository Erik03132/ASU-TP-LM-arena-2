export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    const apiRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content:
              'Ты — AI-ассистент компании АСУ ТП Системы, специализируешься на автоматизации технологических процессов. Отвечай кратко (3–5 предложений), по делу, на русском языке.',
          },
          { role: 'user', content: message },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'Upstream error' });
    }

    const data = await apiRes.json();
    const reply = data.choices?.[0]?.message?.content || 'Нет ответа от модели.';

    res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}
