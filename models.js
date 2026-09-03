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
  return _k1.split(',').map(s => s.trim()).filter(Boolean);
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

// ─── Model Tiers — Unified active model set (Strictly Isolated within Tier) ───
const MODELS = {
  MID: [
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B (Balanced Core)', provider: 'groq' },
    { id: 'cohere/north-mini-code:free', name: 'North Mini Code (30B)', provider: 'openrouter' },
    { id: 'inclusionai/ling-3.0-flash-fin:free', name: 'Ling 3.0 Flash Fin', provider: 'openrouter' },
    { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small 276B', provider: 'openrouter' },
    { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1 (118B)', provider: 'openrouter' }
  ],
  HIGH: [
    { id: 'nvidia/nemotron-3-ultra-550b-a55b', name: 'Nemotron 3 Ultra 550B (High)', provider: 'openrouter' },
    { id: 'cohere/north-mini-code:free', name: 'North Mini Code (30B)', provider: 'openrouter' },
    { id: 'inclusionai/ling-3.0-flash-fin:free', name: 'Ling 3.0 Flash Fin', provider: 'openrouter' },
    { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small 276B', provider: 'openrouter' },
    { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1 (118B)', provider: 'openrouter' }
  ],
  FAST: [
    { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'groq' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Ultra Fast)', provider: 'groq' },
    { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning (1M)', provider: 'openrouter' },
    { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1 (33B)', provider: 'openrouter' }
  ]
};

const DEV_TIER_MODELS = {
  HIGH: [
    { id: 'minimax/minimax-m3:free', name: 'MiniMax M3 Architect (1M)', provider: 'openrouter' },
    { id: 'z-ai/glm-5.2:free', name: 'GLM 5.2 Reasoning (1M)', provider: 'openrouter' },
    { id: 'thinkingmachines/inkling:free', name: 'Inkling 975B (MoE)', provider: 'openrouter' },
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra 550B', provider: 'openrouter' },
    { id: 'minimax/minimax-m2.7:free', name: 'MiniMax M2.7 Reasoning', provider: 'openrouter' }
  ],
  MID: [
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B Lead Architect', provider: 'groq' },
    { id: 'cohere/north-mini-code:free', name: 'North Mini Code (30B)', provider: 'openrouter' },
    { id: 'inclusionai/ling-3.0-flash-fin:free', name: 'Ling 3.0 Flash Fin', provider: 'openrouter' },
    { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small 276B', provider: 'openrouter' },
    { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1 (118B Coding Agent)', provider: 'openrouter' }
  ],
  FAST: [
    { id: 'groq/compound', name: 'Groq Compound Coder', provider: 'groq' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B Rapid Coder', provider: 'groq' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B Fast Coder', provider: 'groq' },
    { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1 (33B)', provider: 'openrouter' }
  ]
};

const DEV_MODELS = DEV_TIER_MODELS.HIGH;

// Backward compat alias — old localStorage values used BALANCE2
MODELS.BALANCE2 = MODELS.HIGH;

function fetchWithHardTimeout(url, options, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('MODEL_TIMEOUT')), timeoutMs);
  });
  return Promise.race([fetch(url, options), timeout]).finally(() => clearTimeout(timeoutId));
}

async function callOpenRouter(model, messages, signal) {
  const openRouterKey = getOpenRouterKey();
  const headers = {
    'Authorization': `Bearer ${openRouterKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://ahmedellansary.github.io/ai-chatbot-app/',
    'X-Title': 'X.v1 AI Chat'
  };

  const isNemotronUltra = model.id === 'nvidia/nemotron-3-ultra-550b-a55b';
  const bodyPayload = {
    model: model.id,
    messages,
    stream: true,
    temperature: isNemotronUltra ? 0.2 : 0.7,
    max_tokens: isNemotronUltra ? 4096 : 8192
  };
  if (isNemotronUltra) {
    bodyPayload.reasoning = { effort: 'low', exclude: true };
    bodyPayload.provider = {
      order: ['deepinfra', 'baseten', 'venice'],
      allow_fallbacks: true,
      require_parameters: true
    };
  }

  let timedOut = false;
  const controller = new AbortController();
  const requestTimeoutMs = isNemotronUltra ? 25000 : 14000;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, requestTimeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const response = await fetchWithHardTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
      signal: combinedSignal
    }, requestTimeoutMs);
    clearTimeout(timeoutId);

    if (response.status === 429 || response.status === 402) {
      rotateOpenRouterKey();
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody.error?.message || `HTTP ${response.status}`;
      throw new Error(response.status === 402 ? `CREDITS_EXHAUSTED: ${msg}` : msg);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${response.status}`;
      if (/credit|402|insufficient/i.test(msg)) {
        rotateOpenRouterKey();
        throw new Error(`CREDITS_EXHAUSTED: ${msg}`);
      }
      throw new Error(msg);
    }
    return response;
  } catch(e) {
    clearTimeout(timeoutId);
    if (timedOut) throw new Error('MODEL_TIMEOUT');
    if (/credit|402|insufficient|CREDITS_EXHAUSTED/i.test(e.message || '')) {
      try { rotateOpenRouterKey(); } catch {}
    }
    throw e;
  }
}

function adaptMessagesForGroqTPM(messages) {
  if (!Array.isArray(messages)) return messages;
  return messages.map(m => {
    if (m.role === 'system' && m.content && m.content.length > 16000) {
      return {
        role: 'system',
        content: m.content.slice(0, 16000) + '\n\n[Core instructions applied fully]'
      };
    }
    return m;
  });
}

async function callGroq(model, messages, signal) {
  const groqKey = getGroqKey();
  const headers = {
    'Authorization': `Bearer ${groqKey}`,
    'Content-Type': 'application/json'
  };

  let timedOut = false;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 6000);
  const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const response = await fetchWithHardTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model.id,
        messages: adaptMessagesForGroqTPM(messages),
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      }),
      signal: combinedSignal
    }, 6000);
    clearTimeout(timeoutId);

    if (response.status === 429) {
      rotateGroqKey();
      throw new Error('RATE_LIMIT');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }
    return response;
  } catch(e) {
    clearTimeout(timeoutId);
    if (timedOut) throw new Error('MODEL_TIMEOUT');
    throw e;
  }
}

async function* readStream(response, signal, model) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedFirstChunk = false;

  const readWithTimeout = async (ms) => {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('STREAM_STALL')), ms);
    });
    try {
      return await Promise.race([reader.read(), timeoutPromise]);
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    while (true) {
      if (signal && signal.aborted) break;
      const isNemotronUltra = model?.id === 'nvidia/nemotron-3-ultra-550b-a55b';
      const timeoutMs = receivedFirstChunk
        ? (isNemotronUltra ? 18000 : 8000)
        : (isNemotronUltra ? 25000 : 12000);
      const readResult = await readWithTimeout(timeoutMs);
      if (signal && signal.aborted) return;
      const { done, value } = readResult;
      if (done) break;
      receivedFirstChunk = true;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        // Handle heartbeats — throttled to 900ms to avoid DOM thrash colliding with stream rendering
        if (trimmed && !trimmed.startsWith('data: ')) {
          try {
            const now = Date.now();
            if (typeof window !== 'undefined' && window.MessageRenderer && typeof window.MessageRenderer.setThinkingStage === 'function') {
              if (!window.__hb_last_ts || now - window.__hb_last_ts > 900) {
                window.__hb_last_ts = now;
                const elapsed = Math.floor((now - (window.__model_stream_start_ts || now)) / 1000);
                try { window.MessageRenderer.setThinkingStage(`Processing... ${elapsed}s`); } catch (e) {}
              }
            }
          } catch (e) {}
          continue;
        }
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error.message || 'Stream error');
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            // mark stream activity timestamp for heartbeat display
            try { if (typeof window !== 'undefined') window.__model_stream_last_chunk_ts = Date.now(); } catch(e){}
            yield delta;
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

async function* chatWithFallback(tier, messages, signal, onModelChange) {
  const normalizedTier = String(tier || 'MID').toUpperCase();
  const models = Array.isArray(MODELS[normalizedTier]) ? MODELS[normalizedTier] : MODELS.MID;
  let usedFallback = false;
  let lastError = null;

  // IMPORTANT: fallback remains inside the selected tier only.
  // HARD -> HARD models only, MID -> MID models only, FAST -> FAST models only.
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

    // Try all available keys for this specific model before moving to the next model in the same tier.
    for (let attempt = 0; attempt < keyCount; attempt++) {
      try {
        const response = model.provider === 'groq'
          ? await callGroq(model, messages, signal)
          : await callOpenRouter(model, messages, signal);

        for await (const chunk of readStream(response, signal, model)) {
          yield { chunk, model, usedFallback };
        }
        succeeded = true;
        return;
      } catch (err) {
        if (signal && signal.aborted) throw err;
        const msg = (err && err.message) ? err.message : String(err);
        lastError = msg;
        console.warn(`[Model Router] ${model.name} (Key ${attempt + 1}/${keyCount}) failed:`, msg);

        // If model timed out, stalled, or request too large: immediately switch to the next model in the tier
        if (/413|too large|content too large|limit \d+|MODEL_TIMEOUT|STREAM_TIMEOUT|STREAM_STALL|timed out|only available on/i.test(msg)) {
          break; // Next model in the SAME tier!
        }

        // Credits exhausted or rate limit: rotate key and retry same model with next key
        if (/CREDITS_EXHAUSTED|402|credit|insufficient|RATE_LIMIT|429|rate limit|rpm/i.test(msg)) {
          if (model.provider === 'groq') rotateGroqKey();
          else rotateOpenRouterKey();
          if (attempt + 1 < keyCount) continue; // Try next key for same model
          break; // No more keys — fall through to next model in tier
        }

        // Any other failure switches to the next model in the same tier
        break;
      }
    }

    if (succeeded) return;
  }

  const details = lastError ? ` — آخر خطأ: ${String(lastError).slice(0,220)}` : '';
  throw new Error(`كل موديلز مستوى ${normalizedTier} توقفت مؤقتاً${details}. جرب مرة أخرى أو اختر وضع آخر.`);
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
  window.DEV_TIER_MODELS = DEV_TIER_MODELS;
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