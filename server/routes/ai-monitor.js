// server/routes/ai-monitor.js
import express from "express";

const router = express.Router();

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>AI Monitor — Crypto Advisor Starter</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.4;margin:18px;color:#0b1220}
    .card{border:1px solid #e6e9ef;border-radius:10px;padding:16px;margin-bottom:12px;background:#fff}
    h1{margin:0 0 8px;font-size:18px}
    .small{font-size:13px;color:#556}
    .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:middle}
    .green{background:#18a058}.red{background:#d64545}.yellow{background:#f5a623}.gray{background:#bfc6d6}
    button{padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#0f1724;color:#fff;cursor:pointer}
    button.secondary{background:#fff;color:#0f1724;border:1px solid #e6e9ef}
    pre{background:#0f1724;color:#e6eef8;padding:12px;border-radius:8px;overflow:auto}
    ul{margin:6px 0 0 18px;padding:0}
  </style>
</head>
<body>
  <div class="card">
    <h1>AI Backend Monitor</h1>
    <div class="small">Quick status for OpenRouter & AI route</div>
    <div style="margin-top:12px;">
      <button id="btnRun">Run AI (BTCUSDT)</button>
      <button id="btnRefresh" class="secondary" style="margin-left:8px">Refresh Status</button>
    </div>
  </div>

  <div id="statusArea" class="card">
    <div id="keyRow"><span class="dot gray"></span>Checking API key...</div>
    <div id="providerRow" style="margin-top:8px"><span class="dot gray"></span>Checking provider access...</div>
    <div id="modelsRow" style="margin-top:8px"><strong>Active models:</strong>
      <ul id="modelList"><li class="small">loading…</li></ul>
    </div>
  </div>

  <div id="aiArea" class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <strong>Latest AI Call</strong>
      <span class="small" id="lastCall">No calls yet</span>
    </div>

    <div style="margin-top:12px;">
      <strong>Last model used:</strong> <span id="lastModel" class="small">—</span>
    </div>

    <div style="margin-top:12px;">
      <strong>AI response (preview):</strong>
      <pre id="aiPreview">No AI output yet.</pre>
    </div>
  </div>

<script>
const statusUrl = '/api/ai/status';
const aiRunUrlBase = '/api/BTCUSDT/ai?force=true';

async function setDot(el, colorClass, text) {
  el.innerHTML = '<span class="dot ' + colorClass + '"></span> ' + (text || '');
}

async function refreshStatus() {
  try {
    const r = await fetch(statusUrl);
    const data = await r.json();
    // key presence
    const keyRow = document.getElementById('keyRow');
    if (data.api_key_detected) {
      setDot(keyRow, 'green', 'API key detected');
    } else {
      setDot(keyRow, 'red', 'No API key set');
    }

    // provider access
    const providerRow = document.getElementById('providerRow');
    const providerOk = data.provider_access && data.provider_access.startsWith('✅');
    setDot(providerRow, providerOk ? 'green' : 'yellow', data.provider_access || 'Unknown');

    // models list
    const list = document.getElementById('modelList');
    list.innerHTML = '';
    if (Array.isArray(data.active_models) && data.active_models.length) {
      data.active_models.forEach(m => {
        const li = document.createElement('li');
        li.textContent = m;
        li.className = 'small';
        list.appendChild(li);
      });
    } else {
      list.innerHTML = '<li class="small">No active models configured.</li>';
    }

    // last success / model
    document.getElementById('lastCall').textContent = data.last_successful_ai_call || 'No AI calls yet';
    if (data.last_confirmed_models && data.last_confirmed_models !== 'None cached yet') {
      document.getElementById('lastModel').textContent = Array.isArray(data.last_confirmed_models) ? data.last_confirmed_models.join(', ') : data.last_confirmed_models;
    } else {
      document.getElementById('lastModel').textContent = '—';
    }

  } catch (err) {
    console.error(err);
    setDot(document.getElementById('keyRow'), 'red', 'Status fetch failed');
    document.getElementById('modelList').innerHTML = '<li class="small">Status fetch error</li>';
  }
}

async function runAI() {
  const btn = document.getElementById('btnRun');
  btn.disabled = true;
  btn.textContent = 'Running...';
  try {
    const r = await fetch(aiRunUrlBase);
    const data = await r.json();
    document.getElementById('aiPreview').textContent = data.ai_summary || JSON.stringify(data, null, 2);
    document.getElementById('lastModel').textContent = data.model || '—';
    document.getElementById('lastCall').textContent = new Date().toISOString();
  } catch (err) {
    document.getElementById('aiPreview').textContent = 'AI call failed: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run AI (BTCUSDT)';
    // refresh status after run
    await refreshStatus();
  }
}

document.getElementById('btnRun').addEventListener('click', runAI);
document.getElementById('btnRefresh').addEventListener('click', refreshStatus);

// Initial load
refreshStatus();
</script>
</body>
</html>`;

// serve the HTML
router.get("/monitor", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
