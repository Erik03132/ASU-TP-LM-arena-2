// In-memory storage for session history
const sessions = new Map();

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, docIds, sessionId = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    if (!process.env.PAGEINDEX_API_KEY) {
      console.error('PAGEINDEX_API_KEY is missing');
      return res.status(500).json({ error: 'PageIndex API key configuration error' });
    }

    // Parse doc IDs from environment or request
    let documentIds = docIds;
    if (!documentIds && process.env.PAGEINDEX_DOC_IDS) {
      documentIds = process.env.PAGEINDEX_DOC_IDS.split(',').map(id => id.trim());
    }

    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: 'No document IDs provided' });
    }

    const key = process.env.PAGEINDEX_API_KEY.trim();

    // Get or initialize session history for PageIndex
    if (!sessions.has(sessionId + '-pageindex')) {
          sessions.set(sessionId + '-pageindex', [
      {
        role: 'system',
        content: 'Ты - профессиональный AI-ассистент по АСУ ТП (автоматизация технологических процессов). Отвечай КРАТКО (максимум 2-3 предложения), профессионально и по существу. Используй технические термины. Если информации нет в документах, скажи это честно одним предложением.'
      }
    ]);
    }

    const history = sessions.get(sessionId + '-pageindex');
    history.push({ role: 'user', content: message });

    // Keep history manageable
  if (history.length > 20) {    }
        history.splice(0, history.length - 20);

    const pageIndexRes = await fetch('https://api.pageindex.ai/chat/completions', {
    method: 'POST',      headers: {
        'Content-Type': 'application/json',
        'api_key': key
      
      body: JSON.stringify({
        doc_id: documentIds,
        messages: history
      })
    });

    const responseData = await pageIndexRes.text();

    if (!pageIndexRes.ok) {
      console.error('PageIndex API error:', responseData);
      return res.status(pageIndexRes.status).json({ 
        error: `PageIndex error: ${pageIndexRes.status}`, 
        details: responseData 
      });
    }

    const data = JSON.parse(responseData);
    let reply = data.choices?.[0]?.message?.content || 'Нет ответа от PageIndex.';

    // Add reply to history
    history.push({ role: 'assistant', content: reply });

    res.status(200).json({ reply, source: 'pageindex' });
  } catch (e) {
    console.error('PageIndex server error:', e);
    res.status(500).json({ error: 'Server error', message: e.message });
  }
}
