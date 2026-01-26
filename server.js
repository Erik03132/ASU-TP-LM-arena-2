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
          content: `ЦЕЛЬ ОТВЕТА:
Отвечай кратко, профессионально и по делу, минимизируя «процесс». При необходимости задавай 1–2 уточняющих вопроса, но только если без них ответ будет неточным.

ОБЩИЕ ПРАВИЛА СТИЛЯ:
1. Максимальная длина ответа: 2–4 предложения (по умолчанию).
2. Избегай описания своих действий («давайте посмотрю», «сначала я найду…» и т.п.).
3. Не повторяй вопрос пользователя в развёрнутом виде, сразу давай содержание ответа.
4. Если пользователь явно просит «подробно» или «развернуто», можешь расширить ответ до 6–8 предложений.

ЛОГИКА ИСПОЛЬЗОВАНИЯ ИСТОЧНИКОВ (Page Index и др.):
1. Если ответ можно дать напрямую — сразу формулируй ответ в 1–3 предложениях.
2. Если информация частично есть, но часть — на картинке, честно укажи, что детализация недоступна.
3. Если контекст документа важен, дай 1–2 предложения про применение, а не пересказ всей главы.

ПРАВИЛА УТОЧНЯЮЩИХ ВОПРОСОВ:
Задавай уточнения только если:
- Вопрос слишком общий, а нужен прикладной ответ.
- Нужно понять формат ответа.
Формат: одно короткое предложение.

СТРУКТУРА ОТВЕТА ПО УМОЛЧАНИЮ:
Если вопрос концептуальный:
1. 1–2 предложения: чёткое определение/ответ.
2. 1–2 предложения: главный практический вывод.

Если вопрос прикладной:
1. 1–2 предложения: общий принцип.
2. 2–3 маркера шагов или рекомендаций.

ЗАПРЕТЫ:
- Писать длинные «подводки» о том, что ты будешь делать.
- Пересказывать структуру документа, если пользователь это явно не запрашивал.
- Оправдываться, что чего-то «не видишь», кроме случаев, когда это меняет смысл.`
        }
      ]);
    }

    const history = sessions.get(sessionId);
    history.push({
      role: 'user',
      content: message
    });

    let perplexityResponse = null;
    let perplexityData = null;

    try {
      perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: history,
          temperature: 0.2,
          max_tokens: 1000
        })
      });

      if (!perplexityResponse.ok) {
        const errorText = await perplexityResponse.text();
        console.error('Perplexity API error:', perplexityResponse.status, errorText);
        return res.status(perplexityResponse.status).json({
          error: 'Perplexity API error',
          details: errorText
        });
      }

      perplexityData = await perplexityResponse.json();

      if (!perplexityData.choices || !perplexityData.choices[0]) {
        console.error('Invalid response structure from Perplexity');
        return res.status(500).json({ error: 'Invalid API response' });
      }

      const aiMessage = perplexityData.choices[0].message.content;

      history.push({
        role: 'assistant',
        content: aiMessage
      });

      // Limit history to last 20 messages
      if (history.length > 21) {
        history.splice(1, history.length - 21);
      }

      res.json({
        response: aiMessage,
        citations: perplexityData.citations || []
      });

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(500).json({
        error: 'Failed to connect to AI service',
        details: fetchError.message
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// PageIndex API endpoint
app.post('/api/chat-pageindex', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    console.log(`Incoming PageIndex message for session ${sessionId}:`, message);

    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    if (!process.env.PAGEINDEX_API_KEY) {
      console.error('PAGEINDEX_API_KEY is missing');
      return res.status(500).json({ error: 'API key configuration error' });
    }

    const key = process.env.PAGEINDEX_API_KEY.trim().replace(/^["']|["']$/g, '');

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }

    const history = sessions.get(sessionId);
    history.push({
      role: 'user',
      content: message
    });

    try {
      const pageIndexResponse = await fetch('https://api.pageindex.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
messages: [
              {
                role: 'system',
                content: `ЦЕЛЬ ОТВЕТА:
Отвечай кратко, профессионально и по делу, минимизируя «процесс». При необходимости задавай 1–2 уточняющих вопроса, но только если без них ответ будет неточным.

ОБЩИЕ ПРАВИЛА СТИЛЯ:
1. Максимальная длина ответа: 2–4 предложения (по умолчанию).
2. Избегай описания своих действий («давайте посмотрю», «сначала я найду…» и т.п.).
3. Не повторяй вопрос пользователя в развёрнутом виде, сразу давай содержание ответа.
4. Если пользователь явно просит «подробно» или «развернуто», можешь расширить ответ до 6–8 предложений.

ЛОГИКА ИСПОЛЬЗОВАНИЯ ИСТОЧНИКОВ (Page Index и др.):
1. Если ответ можно дать напрямую — сразу формулируй ответ в 1–3 предложениях.
2. Если информация частично есть, но часть — на картинке, честно укажи, что детализация недоступна.
3. Если контекст документа важен, дай 1–2 предложения про применение, а не пересказ всей главы.

ПРАВИЛА УТОЧНЯЮЩИХ ВОПРОСОВ:
Задавай уточнения только если:
- Вопрос слишком общий, а нужен прикладной ответ.
- Нужно понять формат ответа.
Формат: одно короткое предложение.

СТРУКТУРА ОТВЕТА ПО УМОЛЧАНИЮ:
Если вопрос концептуальный:
1. 1–2 предложения: чёткое определение/ответ.
2. 1–2 предложения: главный практический вывод.

Если вопрос прикладной:
1. 1–2 предложения: общий принцип.
2. 2–3 маркера шагов или рекомендаций.

ЗАПРЕТЫ:
- Писать длинные «подводки» о том, что ты будешь делать.
- Пересказывать структуру документа, если пользователь это явно не запрашивал.
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать фразы типа: «Я помогу вам найти», «Давайте поищем», «Отлично! Я нашел», «Позвольте посмотреть», «Сейчас я найду» и любые другие описания процесса поиска.
- НЕ используй символы форматирования: ** (жирный), * (курсив), _ (подчеркивание), --- (разделители). Используй только простой текст.
- СРАЗУ давай финальный ответ без промежуточных этапов и комментариев о поиске.
- Оправдываться, что чего-то «не видишь», кроме случаев, когда это меняет смысл.`
              },
              {
                role: 'user',
                content: message
              }
            ],          max_tokens: 1000,
          temperature: 0.2
        })
      });

      if (!pageIndexResponse.ok) {
        const errorText = await pageIndexResponse.text();
        console.error('PageIndex API error:', pageIndexResponse.status, errorText);
        return res.status(pageIndexResponse.status).json({
          error: 'PageIndex API error',
          details: errorText
        });
      }

      const pageIndexData = await pageIndexResponse.json();

if (!pageIndexData.choices || !pageIndexData.choices[0]) {        console.error('Invalid response structure from PageIndex');
        return res.status(500).json({ error: 'Invalid API response' });
      }

const aiMessage = pageIndexData.choices[0].message.content;
            // Удаляем символы форматирования markdown
      const cleanedMessage = aiMessage.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').replace(/---/g, '').trim();
      history.push({
        role: 'assistant',
      content: cleanedMessage      });

      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      res.json({
        response: cleanedMessage,
        citations: pageIndexData.citations || [],
        documents: pageIndexData.documents || []
      });

    } catch (fetchError) {
      console.error('PageIndex fetch error:', fetchError);
      return res.status(500).json({
        error: 'Failed to connect to PageIndex service',
        details: fetchError.message
      });
    }

  } catch (error) {
    console.error('PageIndex server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

app.use(express.static(path.join(__dirname, '.')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
