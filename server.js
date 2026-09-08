const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const groqApiKey = process.env.GROQ_API_KEY;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  if (!groqApiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY가 설정되지 않았습니다.' });
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const safeMessages = messages
    .filter((message) => message && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string')
    .slice(-14)
    .map(({ role, content }) => ({ role, content: content.slice(0, 4000) }));

  if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: '상담 메시지를 입력해 주세요.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        temperature: 0.65,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: '당신은 마음결의 따뜻하고 신중한 AI 상담 파트너입니다. 사용자의 말을 먼저 공감하고, 판단하거나 단정하지 말며, 짧고 자연스러운 한국어로 한 번에 하나의 질문만 건네세요. 해결책을 서두르지 말고 사용자가 자신의 감정을 정리하도록 돕습니다. 자해나 타해 위험이 명확하면 즉시 112 또는 자살예방상담전화 109에 연락하도록 차분히 안내하세요. 당신은 의료 전문가가 아니므로 진단이나 치료를 약속하지 않습니다.'
          },
          ...safeMessages
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Groq API error:', data);
      return res.status(response.status).json({ error: '상담 응답을 잠시 불러오지 못했어요.' });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ error: '상담 응답이 비어 있어요. 잠시 후 다시 시도해 주세요.' });
    }

    return res.json({ reply });
  } catch (error) {
    console.error('Chat request failed:', error);
    return res.status(500).json({ error: '연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`마음결 is listening on http://localhost:${port}`);
});
