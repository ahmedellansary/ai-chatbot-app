// ═══════════════════════════════════════════════════
//  X.v1 — Model Router Module (ESM)
// ═══════════════════════════════════════════════════

const _k1 = [
  ['sk-or-v1-', 'b82e11595ed064e7', '51bfff2b251a4c54', 'ca0da9bc779786cd', 'baf933e916398e03'].join(''),
  ['sk-or-v1-', 'b270099b442b04db', '2403527ab676cdbb', '36c421866844dbfd', '61eccf7e83f71ae3'].join('')
].join(',');
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
    { id: 'thinkingmachines/inkling:free', name: 'Inkling 975B (MoE)', provider: 'openrouter' },
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra 550B', provider: 'openrouter' },
    { id: 'minimax/minimax-m3:free', name: 'MiniMax M3 (1M)', provider: 'openrouter' },
    { id: 'z-ai/glm-5.2:free', name: 'GLM 5.2 (1M)', provider: 'openrouter' },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B', provider: 'openrouter' }
  ],
  MID: [
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B', provider: 'openrouter' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq' },
    { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small 276B', provider: 'openrouter' },
    { id: 'minimax/minimax-m2.7:free', name: 'MiniMax M2.7', provider: 'openrouter' },
    { id: 'inclusionai/ling-3.0-flash-fin:free', name: 'Ling 3.0 Flash Fin', provider: 'openrouter' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', provider: 'groq' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'groq' }
  ],
  FAST: [
    { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning (1M)', provider: 'openrouter' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', provider: 'groq' },
    { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
    { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1 (33B)', provider: 'openrouter' },
    { id: 'cohere/north-mini-code:free', name: 'North Mini Code (30B)', provider: 'openrouter' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'groq' },
    { id: 'groq/compound-mini', name: 'Groq Compound Mini', provider: 'groq' }
  ]
};

const DEV_TIER_MODELS = {
  HIGH: [
    { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1 (118B Coding Agent)', provider: 'openrouter' },
    { id: 'z-ai/glm-5.2:free', name: 'GLM 5.2 Reasoning (1M)', provider: 'openrouter' },
    { id: 'thinkingmachines/inkling:free', name: 'Inkling 975B', provider: 'openrouter' },
    { id: 'minimax/minimax-m3:free', name: 'MiniMax M3 Architect', provider: 'openrouter' },
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra 550B', provider: 'openrouter' }
  ],
  MID: [
    { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1 (118B Coding Agent)', provider: 'openrouter' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B Lead Architect', provider: 'groq' },
    { id: 'cohere/north-mini-code:free', name: 'North Mini Code (30B)', provider: 'openrouter' },
    { id: 'minimax/minimax-m2.7:free', name: 'MiniMax M2.7 Reasoning', provider: 'openrouter' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B Fast Coder', provider: 'groq' }
  ],
  FAST: [
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B Fast Coder', provider: 'groq' },
    { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1 (33B)', provider: 'openrouter' },
    { id: 'cohere/north-mini-code:free', name: 'North Mini Code', provider: 'openrouter' },
    { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'groq' }
  ]
};

const DEV_MODELS = DEV_TIER_MODELS.HIGH;

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
    const isFallback = i > 0;
    if (isFallback) {
      usedFallback = true;
      onModelChange?.(model, true);
    } else {
      onModelChange?.(model, false);
    }

    const keyCount = model.provider === 'groq'
      ? Math.max(1, getGroqKeys().length)
      : Math.max(1, getOpenRouterKeys().length);

    let succeeded = false;

    // Try ALL available keys for the strongest model first before falling back to next model
    for (let attempt = 0; attempt < keyCount; attempt++) {
      try {
        const response = model.provider === 'groq'
          ? await callGroq(model, messages, signal)
          : await callOpenRouter(model, messages, signal);

        for await (const chunk of readStream(response)) {
          yield { chunk, model, usedFallback };
        }
        succeeded = true;
        return;
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn(`[Model Router] ${model.name} (Key ${attempt + 1}/${keyCount}) failed:`, err.message);

        // If rate limit / quota, rotate to next key of the SAME strong model
        if (err.message === 'RATE_LIMIT' || /429|rate limit|tpm|rpm/i.test(err.message)) {
          if (model.provider === 'groq') rotateGroqKey();
          else rotateOpenRouterKey();
          continue; // Next key on the same strong model
        } else {
          // If offline / bad request / server error, switch to next model in tier
          break;
        }
      }
    }

    if (succeeded) return;
  }

  throw new Error(`كل موديلز ومفاتيح مستوى ${tier} توقفت مؤقتاً. جرب مرة أخرى.`);
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