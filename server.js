const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.post('/api/chat', async (req, res) => {
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
});

app.get('/zhkh', (req, res) => {
  res.sendFile(path.join(__dirname, 'asu-tp-zhkh.html'));
});

app.get('/food', (req, res) => {
  res.sendFile(path.join(__dirname, 'pischevaya-promyshlennost.html'));
});

app.get('/engineering', (req, res) => {
  res.sendFile(path.join(__dirname, 'mashinostroenie.html'));
});

app.get('/oil-gas', (req, res) => {
  res.sendFile(path.join(__dirname, 'neftegazservis.html'));
});

app.get('/logistics', (req, res) => {
  res.sendFile(path.join(__dirname, 'logistika.html'));
});

app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
