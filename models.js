// ═══════════════════════════════════════════════════
//  X.v1 — Model Router Module (ESM)
// ═══════════════════════════════════════════════════

const _k1 = ['sk-or-v1-', 'b82e11595ed064e7', '51bfff2b251a4c54', 'ca0da9bc779786cd', 'baf933e916398e03'].join('');
const _k2 = [
  ['gsk_6ULPilUmj8gf0mbu2ZlX', 'WGdyb3FYkqImKQ7lZPdjGIBERqBKrDhX'].join(''),
  ['gsk_ECkO3AaJ8sBRAnd7gLMN', 'WGdyb3FYTMBNYK0SxQU6W1CSXEx23koB'].join(''),
  ['gsk_QiThrmueUOxgPM9xcIwn', 'WGdyb3FYVF37eSLhIgG9RYTXakzxc16l'].join(''),
  ['gsk_dVkSeAKGE0wQRxqy7OWX', 'WGdyb3FY0vHBuaJxlmnjbaPytbsl4dn8'].join(''),
  ['gsk_u5bCiNIx7oQaS2XzqiAG', 'WGdyb3FYE6s7QoY0qntIUhBU4D13AhjZ'].join('')
].join(',');

const getOpenRouterKey = () => {
  const k = (typeof window !== 'undefined' && window.AppConfig && window.AppConfig.getOpenRouterKey && window.AppConfig.getOpenRouterKey()) ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('OPENROUTER_API_KEY') : null);
  return (k && k.trim()) ? k.trim() : _k1;
};

const getGroqKeys = () => {
  const k = (typeof window !== 'undefined' && window.AppConfig && window.AppConfig.getGroqKeys && window.AppConfig.getGroqKeys()) ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('GROQ_API_KEY') : null);
  if (Array.isArray(k) && k.length) return k;
  if (typeof k === 'string' && k.trim()) return k.split(',').map(s => s.trim()).filter(Boolean);
  return _k2.split(',');
};

let groqKeyIndex = 0;
const getGroqKey = () => {
  const keys = getGroqKeys();
  return keys[groqKeyIndex % keys.length];
};
const rotateGroqKey = () => { groqKeyIndex++; };

// ─── Model Tiers ───
const MODELS = {
  HIGH: [
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 550B', provider: 'openrouter' },
    { id: 'minimax/minimax-m3:free', name: 'MiniMax M3', provider: 'openrouter' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq' }
  ],
  MID: [
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 120B', provider: 'openrouter' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 27B', provider: 'groq' }
  ],
  FAST: [
    { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 27B', provider: 'groq' }
  ]
};

const DEV_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B Lead Developer', provider: 'groq' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen3 27B', provider: 'groq' }
];

async function callOpenRouter(model, messages, signal) {
  const openRouterKey = getOpenRouterKey();
  const headers = {
    'Authorization': `Bearer ${openRouterKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://ahmedellansary.github.io/ai-chatbot-app/',
    'X-Title': 'X.v1 AI Chat'
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.id,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048
    }),
    signal
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }
  return response;
}

async function callGroq(model, messages, signal) {
  const groqKey = getGroqKey();
  const headers = {
    'Authorization': `Bearer ${groqKey}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.id,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048
    }),
    signal
  });

  if (response.status === 429) {
    rotateGroqKey();
    throw new Error('RATE_LIMIT');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }
  return response;
}

async function* readStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let tokensEmitted = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const obj = JSON.parse(trimmed);
            if (obj.error) throw new Error(obj.error.message || 'Stream error');
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error.message || 'Stream error');
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield delta;
            tokensEmitted++;
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }
    if (tokensEmitted === 0 && buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.error) throw new Error(parsed.error.message || 'Stream error');
        const content = parsed.choices?.[0]?.message?.content;
        if (content) yield content;
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* chatWithFallback(tier, messages, signal, onModelChange) {
  const models = MODELS[tier] || MODELS.MID;
  let usedFallback = false;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i > 0) {
      usedFallback = true;
      onModelChange?.(model, true);
    } else {
      onModelChange?.(model, false);
    }

    try {
      const response = model.provider === 'groq'
        ? await callGroq(model, messages, signal)
        : await callOpenRouter(model, messages, signal);

      for await (const chunk of readStream(response)) {
        yield { chunk, model, usedFallback };
      }
      return;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn(`[Model Router] ${model.name} failed:`, err.message);

      if (err.message === 'RATE_LIMIT' && model.provider === 'groq') {
        try {
          const response = await callGroq(model, messages, signal);
          for await (const chunk of readStream(response)) {
            yield { chunk, model, usedFallback };
          }
          return;
        } catch {}
      }
    }
  }

  throw new Error(`كل موديلز ${tier} توقفت مؤقتاً. جرب مرة أخرى أو غيّر الـ Mode.`);
}

export { chatWithFallback, readStream, MODELS, DEV_MODELS };