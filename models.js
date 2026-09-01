// ═══════════════════════════════════════════════════
//  AI CHAT — Model Router with Intelligent Fallback
// ═══════════════════════════════════════════════════

// API keys are stored securely in localStorage (never in source code)
const OPENROUTER_KEY = localStorage.getItem('OPENROUTER_API_KEY') || '';
const GROQ_KEYS = (localStorage.getItem('GROQ_API_KEY') || '').split(',').filter(Boolean);

// Current Groq key index (rotates on rate limit)
let groqKeyIndex = 0;
const getGroqKey = () => GROQ_KEYS[groqKeyIndex % GROQ_KEYS.length];
const rotateGroqKey = () => { groqKeyIndex++; };

// ─── Model Tiers ───
const MODELS = {
  HIGH: [
    {
      id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      name: 'Nemotron Ultra 550B',
      provider: 'openrouter',
      context: 1000000
    },
    {
      id: 'minimax/minimax-m3:free',
      name: 'MiniMax M3',
      provider: 'openrouter',
      context: 1048576
    }
  ],
  MID: [
    {
      id: 'nvidia/nemotron-3-super-120b-a12b:free',
      name: 'Nemotron Super 120B',
      provider: 'openrouter',
      context: 262144
    },
    {
      id: 'openai/gpt-oss-120b',
      name: 'GPT OSS 120B',
      provider: 'groq',
      context: 131072
    },
    {
      id: 'qwen/qwen3.8-27b',
      name: 'Qwen3 27B',
      provider: 'groq',
      context: 131072
    }
  ],
  FAST: [
    {
      id: 'groq/compound',
      name: 'Groq Compound',
      provider: 'groq',
      context: 131072
    },
    {
      id: 'qwen/qwen3.6-27b',
      name: 'Qwen3.6 27B',
      provider: 'groq',
      context: 131072
    },
    {
      id: 'nvidia/nemotron-3.5-lightning:free',
      name: 'Nemotron Lightning',
      provider: 'openrouter',
      context: 1000000
    }
  ]
};

// Dev mode models (best for coding)
const DEV_MODELS = [
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'Nemotron Nano Reasoning',
    provider: 'openrouter'
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen3 27B',
    provider: 'groq'
  }
];

// ─── Core API Call ───
async function callOpenRouter(model, messages, signal) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Chat'
    },
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
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getGroqKey()}`,
      'Content-Type': 'application/json'
    },
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

// ─── Stream Reader ───
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

// ─── Smart Fallback Router ───
async function* chatWithFallback(tier, messages, signal, onModelChange) {
  const models = MODELS[tier];
  let lastError = null;
  let usedFallback = false;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i > 0) {
      usedFallback = true;
      onModelChange?.(model, usedFallback);
    } else {
      onModelChange?.(model, false);
    }

    try {
      let response;
      if (model.provider === 'groq') {
        response = await callGroq(model, messages, signal);
      } else {
        response = await callOpenRouter(model, messages, signal);
      }

      for await (const chunk of readStream(response)) {
        yield { chunk, model, usedFallback };
      }
      return; // Success — stop

    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
      console.warn(`[Model Router] ${model.name} failed:`, err.message);

      // Retry with Groq key rotation
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

  // All models failed
  throw new Error(`كل موديلز ${tier} توقفت مؤقتاً. جرب مرة أخرى أو غيّر الـ Mode.`);
}

// ─── Dev Mode: Code Generation ───
async function generateCode(prompt, signal) {
  for (const model of DEV_MODELS) {
    try {
      let response;
      if (model.provider === 'groq') {
        response = await callGroq(model, prompt, signal);
      } else {
        response = await callOpenRouter(model, prompt, signal);
      }
      return { response, model };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn(`Dev model ${model.name} failed, trying next...`);
    }
  }
  throw new Error('فشلت جميع موديلز البرمجة.');
}

export { chatWithFallback, generateCode, readStream, MODELS, DEV_MODELS };
