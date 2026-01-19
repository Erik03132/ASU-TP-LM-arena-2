const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());

// In-memory storage for session history (for demonstration/simple use)
// In production, use a database or Redis
const sessions = new Map();

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    console.log(`Incoming message for session ${sessionId}:`, message);

    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is missing');
      return res.status(500).json({ error: 'API key configuration error' });
    }

    const key = process.env.PERPLEXITY_API_KEY.trim().replace(/^["']|["']$/g, '');

    // Get or initialize session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, [
        {
          role: 'system',
          content: `Стиль ответа:
Отвечай кратко: 1–3 предложения, без “воды” и маркетинга.
Используй профессиональные, но понятные термины, избегай жаргона и сложных аббревиатур без расшифровки.
Сначала давай прямой ответ, затем при необходимости 1 уточнение или пример.

Работа с вопросом:
Если вопрос общий (“что такое…?”) — дай чёткое определение и 1–2 ключевых эффекта (надёжность, безопасность, экономия).
Если вопрос прикладной (“можно ли у нас…?”) — ответь да/нет/зависит и укажи от каких факторов (тип производства, существующая система, требования безопасности).
При неясном вопросе задай один уточняющий вопрос: “Уточните, пожалуйста: …”.

Использование информации из интернета:
Из внешних источников бери только ядро смысла: 1–2 главные идеи без деталей реализации.
Не копируй текст целиком, формулируй ответ своими словами в деловом стиле.
Никогда не ссылайся на конкретные сайты и бренды, кроме случаев, когда клиент прямо спрашивает о них.

Ограничения и эскалация:
Если нет уверенности в ответе — так и скажи и предложи консультацию инженера: “Этот вопрос требует анализа объекта, рекомендую обсудить с инженером‑проектировщиком.”
Для сложных запросов (проектирование, выбор ПЛК/SCADA, безопасность) всегда предлагай связаться с живым специалистом или оставить контакты.

Структура типового ответа:
1‑я фраза: сущность ответа (что / можно ли / как).
2‑я фраза: ключевой эффект или условие.
3‑я фраза (при необходимости): предложение следующего шага (аудит, консультация, коммерческое предложение).`
        }
      ]);
    }

    const history = sessions.get(sessionId);
    history.push({ role: 'user', content: message });

    // Keep history manageable (e.g., last 10 messages + system prompt)
    if (history.length > 11) {
      history.splice(1, history.length - 11);
    }

    const apiRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: history,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    const responseData = await apiRes.text();
    
    if (!apiRes.ok) {
      console.error('Perplexity API error details:', responseData);
      return res.status(apiRes.status).json({ error: `Upstream error: ${apiRes.status}`, details: responseData });
    }

    const data = JSON.parse(responseData);
    let reply = data.choices?.[0]?.message?.content || 'Нет ответа от модели.';

    // Clean reply
    reply = reply.replace(/\*\*/g, '').replace(/\[\d+\]/g, '').trim();

    // Add reply to history
    history.push({ role: 'assistant', content: reply });

    res.status(200).json({ reply });
  } catch (e) {
    console.error('Detailed server error:', e);
    res.status(500).json({ error: 'Server error', message: e.message });
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
