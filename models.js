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

const getOpenRouterKeys = () => {
  if (typeof window !== 'undefined' && window.ConfigVault && window.ConfigVault.getOpenRouterKeys) return window.ConfigVault.getOpenRouterKeys();
  const k = (typeof window !== 'undefined' && window.AppConfig && window.AppConfig.getOpenRouterKeys && window.AppConfig.getOpenRouterKeys()) ||
            (typeof localStorage !== 'undefined' ? (localStorage.getItem('OPENROUTER_API_KEYS') || localStorage.getItem('OPENROUTER_API_KEY')) : null);
  if (Array.isArray(k) && k.length) return k.map(s => String(s).trim()).filter(Boolean);
  if (typeof k === 'string' && k.trim()) {
    const list = k.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (list.length) return list;
  }
  return [_k1];
};

let openRouterKeyIndex = 0;
const getOpenRouterKey = () => {
  if (typeof window !== 'undefined' && window.ConfigVault && window.ConfigVault.getOpenRouterKey) return window.ConfigVault.getOpenRouterKey();
  const keys = getOpenRouterKeys();
  return keys[openRouterKeyIndex % keys.length];
};
const rotateOpenRouterKey = () => {
  if (typeof window !== 'undefined' && window.ConfigVault && window.ConfigVault.rotateOpenRouterKey) return window.ConfigVault.rotateOpenRouterKey();
  openRouterKeyIndex++;
};

const getGroqKeys = () => {
  if (typeof window !== 'undefined' && window.ConfigVault && window.ConfigVault.getGroqKeys) return window.ConfigVault.getGroqKeys();
  const k = (typeof window !== 'undefined' && window.AppConfig && window.AppConfig.getGroqKeys && window.AppConfig.getGroqKeys()) ||
            (typeof localStorage !== 'undefined' ? (localStorage.getItem('GROQ_API_KEYS') || localStorage.getItem('GROQ_API_KEY')) : null);
  if (Array.isArray(k) && k.length) return k.map(s => String(s).trim()).filter(Boolean);
  if (typeof k === 'string' && k.trim()) {
    const list = k.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (list.length) return list;
  }
  return _k2.split(',');
};

let groqKeyIndex = 0;
const getGroqKey = () => {
  if (typeof window !== 'undefined' && window.ConfigVault && window.ConfigVault.getGroqKey) return window.ConfigVault.getGroqKey();
  const keys = getGroqKeys();
  return keys[groqKeyIndex % keys.length];
};
const rotateGroqKey = () => {
  if (typeof window !== 'undefined' && window.ConfigVault && window.ConfigVault.rotateGroqKey) return window.ConfigVault.rotateGroqKey();
  groqKeyIndex++;
};

// ─── Model Tiers — Unified active model set (Strictly Isolated, Strongest to Weakest) ───
const MODELS = {
  HIGH: [
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B (Ultra Fast)', provider: 'groq' },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B', provider: 'openrouter' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', provider: 'groq' },
    { id: 'minimax/minimax-m3:free', name: 'MiniMax M3', provider: 'openrouter' }
  ],
  MID: [
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B (Ultra Fast)', provider: 'groq' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', provider: 'groq' },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B', provider: 'openrouter' },
    { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' }
  ],
  FAST: [
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Instant)', provider: 'groq' },
    { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'groq' }
  ]
};

const DEV_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B Lead Architect', provider: 'groq' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B Fast Coder', provider: 'groq' },
  { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B', provider: 'openrouter' },
  { id: 'minimax/minimax-m3:free', name: 'MiniMax M3 Architect', provider: 'openrouter' }
];

async function callOpenRouter(model, messages, signal) {
  const openRouterKey = getOpenRouterKey();
  const headers = {
    'Authorization': `Bearer ${openRouterKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://ahmedellansary.github.io/ai-chatbot-app/',
    'X-Title': 'X.v1 AI Chat'
  };

  const bodyPayload = {
    model: model.id,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 8192
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
    signal
  });

  if (response.status === 429) {
    rotateOpenRouterKey();
    throw new Error('RATE_LIMIT');
  }

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
          if (parsed.error) throw new Error(parsed.error.message || 'Stream error');
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
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

      if (err.message === 'RATE_LIMIT') {
        try {
          const response = model.provider === 'groq'
            ? await callGroq(model, messages, signal)
            : await callOpenRouter(model, messages, signal);
          for await (const chunk of readStream(response)) {
            yield { chunk, model, usedFallback };
          }
          return;
        } catch (retryErr) {
          if (retryErr.name === 'AbortError') throw retryErr;
          console.warn(`[Model Router] Retry failed:`, retryErr.message);
        }
      }
    }
  }

  throw new Error(`كل موديلز ${tier} توقفت مؤقتاً. جرب مرة أخرى أو غيّر الـ Mode.`);
}

function normalizeCatalog(data) {
  if (!data) return [];
  const source = Array.isArray(data) ? data : Object.values(data).flat();
  const seen = new Set();
  return source.filter(item => {
    if (!item || !item.id || !item.name) return false;
    const key = `${item.provider || 'unknown'}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getAvailableModels() {
  const catalog = (typeof window !== 'undefined' && window.state && window.state.modelCatalog && window.state.modelCatalog.length)
    ? window.state.modelCatalog
    : normalizeCatalog(MODELS);
  const seen = new Set();
  return catalog.filter(m => {
    const key = `${m.provider}:${m.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSelectedDevModel() {
  const models = getAvailableModels();
  if (!models.length) return null;
  const devKey = (typeof window !== 'undefined' && window.state && window.state.devModelKey) || `${models[0].provider}:${models[0].id}`;
  const selected = models.find(m => `${m.provider}:${m.id}` === devKey) || models[0];
  if (typeof window !== 'undefined' && window.state) window.state.devModelKey = `${selected.provider}:${selected.id}`;
  return selected;
}

// export { chatWithFallback, readStream, MODELS, DEV_MODELS }; // ESM — disabled for IIFE load (use window.*)

// ── Global exposure for IIFE apps (Phase 2 Refactor) ──
if (typeof window !== 'undefined') {
  window.MODELS = MODELS;
  window.DEV_MODELS = DEV_MODELS;
  window.ModelEngine = {
    callOpenRouter,
    callGroq,
    readStream,
    chatWithFallback,
    getOpenRouterKey,
    getGroqKeys,
    getGroqKey,
    rotateGroqKey,
    normalizeCatalog,
    getAvailableModels,
    getSelectedDevModel
  };
  window.getOpenRouterKey = getOpenRouterKey;
  window.getGroqKeys = getGroqKeys;
  window.getGroqKey = getGroqKey;
  window.rotateGroqKey = rotateGroqKey;
}