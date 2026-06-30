const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = __dirname;
const port = 8787;
const startKey = 'key-server-1991';
const stopKey = 'key-server-off-1991';
const ollamaPath = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
const sharedStatePath = path.join(root, 'studio-shared-state.json');
const devicesPath = path.join(root, 'studio-devices.json');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8'
};

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function checkOllama(timeoutMs = 2200) {
  return new Promise((resolve) => {
    let finished = false;
    const done = (ok) => {
      if (finished) return;
      finished = true;
      resolve(ok);
    };

    const req = http.request({
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/tags',
      method: 'GET'
    }, (ollamaRes) => {
      done(ollamaRes.statusCode === 200);
    });

    req.on('error', () => done(false));
    req.setTimeout(timeoutMs, () => {
      done(false);
      req.destroy();
    });
    req.end();
  });
}

function readJsonBody(req, maxBytes = 2_000_000) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function cleanIp(value) {
  return String(value || '').replace(/^::ffff:/, '');
}

function deviceNameFromAgent(userAgent) {
  const ua = String(userAgent || '');
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'PC Windows';
  if (/macintosh|mac os/i.test(ua)) return 'Mac';
  return 'Dispositivo';
}

function isHostDevice(device) {
  return /windows/i.test(String(device.userAgent || '')) || /^PC Windows$/i.test(String(device.name || ''));
}

function loadDevices() {
  const data = readJsonFile(devicesPath, { devices: {} });
  return data && data.devices ? data : { devices: {} };
}

function saveDevices(data) {
  writeJsonFile(devicesPath, data);
}

function publicDevices(data) {
  const now = Date.now();
  return Object.values(data.devices || {})
    .map((device) => ({
      id: device.id,
      name: device.name,
      ip: device.ip,
      host: Boolean(device.host || isHostDevice(device)),
      blocked: Boolean(device.blocked),
      online: now - Number(device.lastSeen || 0) < 12000,
      lastSeen: device.lastSeen || 0
    }))
    .sort((a, b) => Number(b.lastSeen) - Number(a.lastSeen));
}

async function waitForOllama() {
  for (let index = 0; index < 14; index += 1) {
    if (await checkOllama(1200)) return true;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return false;
}

function stopOllama() {
  try {
    const child = spawn('taskkill.exe', ['/IM', 'ollama.exe', '/F'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
  } catch {
    // If Windows refuses taskkill, the Studio web server stays available.
  }
}

const server = http.createServer((req, res) => {
  const reqPath = req.url.split('?')[0];

  if (req.method === 'GET' && reqPath === '/api/health') {
    checkOllama().then((ok) => json(res, ok ? 200 : 502, { ok }));
    return;
  }

  if (req.method === 'POST' && reqPath === '/api/device/heartbeat') {
    readJsonBody(req).then((body) => {
      const id = String(body.id || '').slice(0, 80);
      if (!id) {
        json(res, 400, { ok: false, error: 'missing-device' });
        return;
      }

      const data = loadDevices();
      const previous = data.devices[id] || {};
      data.devices[id] = {
        id,
        name: String(body.name || previous.name || deviceNameFromAgent(req.headers['user-agent'])).slice(0, 40),
        ip: cleanIp(req.socket.remoteAddress),
        userAgent: String(req.headers['user-agent'] || '').slice(0, 220),
        host: Boolean(previous.host || isHostDevice({ name: body.name, userAgent: req.headers['user-agent'] })),
        blocked: Boolean(previous.blocked) && !Boolean(previous.host || isHostDevice({ name: body.name, userAgent: req.headers['user-agent'] })),
        lastSeen: Date.now()
      };
      saveDevices(data);
      json(res, 200, {
        ok: true,
        blocked: Boolean(data.devices[id].blocked) && !Boolean(data.devices[id].host),
        devices: publicDevices(data)
      });
    });
    return;
  }

  if (req.method === 'GET' && reqPath === '/api/devices') {
    json(res, 200, { ok: true, devices: publicDevices(loadDevices()) });
    return;
  }

  if (req.method === 'POST' && reqPath === '/api/device/block') {
    readJsonBody(req).then((body) => {
      const id = String(body.id || '').slice(0, 80);
      const data = loadDevices();
      if (!id || !data.devices[id]) {
        json(res, 404, { ok: false, error: 'device-not-found' });
        return;
      }

      if (data.devices[id].host || isHostDevice(data.devices[id])) {
        data.devices[id].host = true;
        data.devices[id].blocked = false;
        saveDevices(data);
        json(res, 403, { ok: false, error: 'host-protected', devices: publicDevices(data) });
        return;
      }

      data.devices[id].blocked = true;
      saveDevices(data);
      json(res, 200, { ok: true, devices: publicDevices(data) });
    });
    return;
  }

  if (req.method === 'POST' && reqPath === '/api/device/unlock') {
    readJsonBody(req).then((body) => {
      const query = String(body.query || '').trim().toLowerCase();
      const data = loadDevices();
      const device = Object.values(data.devices).find((item) => {
        return item.id.toLowerCase().includes(query) || String(item.name || '').toLowerCase().includes(query);
      });
      if (!query || !device) {
        json(res, 404, { ok: false, error: 'device-not-found', devices: publicDevices(data) });
        return;
      }

      device.blocked = false;
      saveDevices(data);
      json(res, 200, { ok: true, device, devices: publicDevices(data) });
    });
    return;
  }

  if (req.method === 'GET' && reqPath === '/api/state') {
    json(res, 200, { ok: true, state: readJsonFile(sharedStatePath, null) });
    return;
  }

  if (req.method === 'POST' && reqPath === '/api/state') {
    readJsonBody(req, 6_000_000).then((body) => {
      if (!body || !body.state || !Array.isArray(body.state.conversations)) {
        json(res, 400, { ok: false, error: 'bad-state' });
        return;
      }

      const updatedAt = Date.now();
      writeJsonFile(sharedStatePath, {
        ...body.state,
        updatedAt
      });
      json(res, 200, { ok: true, updatedAt });
    });
    return;
  }

  if (req.method === 'POST' && reqPath === '/api/start-ai') {
    readJsonBody(req).then(async (body) => {
      if (!body || body.key !== startKey) {
        json(res, 403, { ok: false, error: 'bad-key' });
        return;
      }

      if (await checkOllama()) {
        json(res, 200, { ok: true, alreadyRunning: true });
        return;
      }

      if (!fs.existsSync(ollamaPath)) {
        json(res, 404, { ok: false, error: 'ollama-not-found' });
        return;
      }

      try {
        const child = spawn(ollamaPath, ['serve'], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          env: {
            ...process.env,
            OLLAMA_MODELS: process.env.OLLAMA_MODELS || 'A:\\Studio\\Models'
          }
        });
        child.unref();
      } catch {
        json(res, 500, { ok: false, error: 'start-failed' });
        return;
      }

      const ok = await waitForOllama();
      json(res, ok ? 200 : 504, { ok, started: ok });
    });
    return;
  }

  if (req.method === 'POST' && reqPath === '/api/stop-server') {
    readJsonBody(req).then((body) => {
      if (!body || body.key !== stopKey) {
        json(res, 403, { ok: false, error: 'bad-key' });
        return;
      }

      json(res, 200, { ok: true, stopping: true });
      stopOllama();
    });
    return;
  }

  if (req.method === 'POST' && reqPath === '/api/chat') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const proxy = http.request({
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (ollamaRes) => {
        res.writeHead(ollamaRes.statusCode || 500, {
          'Content-Type': ollamaRes.headers['content-type'] || 'application/json'
        });
        ollamaRes.pipe(res);
      });

      proxy.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ollama unavailable' }));
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  const urlPath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(root, path.normalize(urlPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'text/plain; charset=utf-8' });
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Studio AI aberto em http://127.0.0.1:${port}`);
  console.log(`Na rede local, abre http://IP-DO-PC:${port}`);
});
