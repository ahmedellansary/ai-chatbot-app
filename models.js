// ═══════════════════════════════════════════════════
//  AI CHAT — Model Router with Intelligent Fallback
// ═══════════════════════════════════════════════════

function readConfigValue(key, fallback = '') {
  try {
    const runtimeConfig = (window && window.__APP_CONFIG__) || {};
    const runtimeValue = runtimeConfig[key];
    if (runtimeValue !== undefined && runtimeValue !== null && String(runtimeValue).trim()) {
      return String(runtimeValue).trim();
    }

    const localValue = localStorage.getItem(key);
    if (localValue !== undefined && localValue !== null && localValue.trim()) {
      return localValue.trim();
    }

    return fallback;
  } catch {
    return fallback;
  }
}

const getOpenRouterKey = () => readConfigValue('OPENROUTER_API_KEY');
const getGroqKeys = () => readConfigValue('GROQ_API_KEY', '').split(',').map(value => value.trim()).filter(Boolean);

let groqKeyIndex = 0;
const getGroqKey = () => {
  const keys = getGroqKeys();
  if (!keys.length) return '';
  return keys[groqKeyIndex % keys.length];
};
const rotateGroqKey = () => { groqKeyIndex++; };

// ─── Model Tiers ───
const MODELS = {
  HIGH: [
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron Ultra 550B', provider: 'openrouter' },
    { id: 'minimax/minimax-m3:free', name: 'MiniMax M3', provider: 'openrouter' }
  ],
  MID: [
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron Super 120B', provider: 'openrouter' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen3 27B', provider: 'groq' }
  ],
  FAST: [
    { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
    { id: 'qwen/qwen3.6-27b', name: 'Qwen3.6 27B', provider: 'groq' },
    { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron Lightning', provider: 'openrouter' }
  ]
};

const DEV_MODELS = [
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'Nemotron Nano Reasoning', provider: 'openrouter' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen3 27B', provider: 'groq' }
];

async function callOpenRouter(model, messages, signal) {
  const openRouterKey = getOpenRouterKey();
  const headers = {
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin,
    'X-Title': 'AI Chat'
  };

  if (openRouterKey) {
    headers.Authorization = `Bearer ${openRouterKey}`;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.id,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096
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
  const headers = { 'Content-Type': 'application/json' };

  if (groqKey) {
    headers.Authorization = `Bearer ${groqKey}`;
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.id,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* chatWithFallback(tier, messages, signal, onModelChange) {
  const models = MODELS[tier];
  let usedFallback = false;

  if (!models || !models.length) {
    throw new Error(`No model tier configured for ${tier}`);
  }

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i > 0) {
      usedFallback = true;
      onModelChange?.(model, usedFallback);
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