#!/usr/bin/env node
/* ============================================================
   GITHUB SETUP (device flow, no git install needed)
   start  : asks GitHub for a one time code
   finish : waits for approval, creates the repo, uploads the site
   ============================================================ */
const fs = require('fs');
const path = require('path');

const CLIENT_ID = '178c6fc778ccc68e1d6a'; // GitHub CLI public OAuth app
const SCOPE = 'public_repo';
const REPO = 'muchuoclifford-site';
const DEVICE_FILE = path.join(__dirname, '..', '.github-device.json');

const API = 'https://api.github.com';
const HEADERS = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'muchuoclifford-setup' };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function start() {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: SCOPE })
  });
  const data = await res.json();
  if (!data.device_code) throw new Error('GitHub did not return a device code: ' + JSON.stringify(data));
  fs.writeFileSync(DEVICE_FILE, JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ user_code: data.user_code, verification_uri: data.verification_uri, expires_in: data.expires_in }));
}

const TOKEN_FILE = path.join(__dirname, '..', '.github-token.json');

async function getToken() {
  /* reuse a token from a previous interrupted run */
  try {
    const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    if (saved.access_token) {
      const check = await fetch(API + '/user', { headers: { ...HEADERS, Authorization: `Bearer ${saved.access_token}` } });
      if (check.ok) return saved.access_token;
    }
  } catch {}

  const dev = JSON.parse(fs.readFileSync(DEVICE_FILE, 'utf8'));
  const started = Date.now();
  let interval = (dev.interval || 5) * 1000;
  while (Date.now() - started < (dev.expires_in || 900) * 1000) {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: dev.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    });
    const data = await res.json();
    if (data.access_token) {
      try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: data.access_token, scope: data.scope }, null, 2)); } catch {}
      return data.access_token;
    }
    if (data.error === 'authorization_pending') { await sleep(interval); continue; }
    if (data.error === 'slow_down') { interval += 5000; await sleep(interval); continue; }
    throw new Error('Authorization failed: ' + JSON.stringify(data));
  }
  throw new Error('The code expired before it was approved. Run start again.');
}

async function gh(token, method, url, body) {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: { ...HEADERS, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`GitHub ${method} ${url} failed (${res.status}): ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)}`);
  return data;
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.netlify', '.github', 'images\\uploads']);
const SKIP_FILES = new Set(['server.js', 'DEPLOY.md', 'tools/migrate-content.js', '.github-device.json', '.github-token.json']);

function collect(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...collect(path.join(dir, entry.name), rel));
    } else {
      if (SKIP_FILES.has(rel)) continue;
      if (/\.zip$/i.test(entry.name)) continue;
      if (/^_.*\.js$/i.test(entry.name)) continue;
      out.push(rel);
    }
  }
  return out;
}

async function finish() {
  const token = await getToken();
  const me = await gh(token, 'GET', '/user');
  const owner = me.login;

  let repo;
  try {
    repo = await gh(token, 'GET', `/repos/${owner}/${REPO}`);
    console.log('repo exists:', repo.html_url);
  } catch (e) {
    repo = await gh(token, 'POST', '/user/repos', {
      name: REPO,
      description: 'Muchuo Clifford, The Hungry Videographer. Website and Decap CMS.',
      private: false,
      auto_init: false
    });
    console.log('repo created:', repo.html_url);
  }

  const root = path.join(__dirname, '..');
  const files = collect(root);
  console.log('uploading', files.length, 'files...');

  /* an empty repository cannot receive blobs, make an initial commit first */
  let baseSha = null;
  try {
    const ref = await gh(token, 'GET', `/repos/${owner}/${REPO}/git/ref/heads/main`);
    baseSha = ref.object.sha;
  } catch {
    await gh(token, 'PUT', `/repos/${owner}/${REPO}/contents/README.md`, {
      message: 'Start website',
      content: Buffer.from('# Muchuo Clifford, The Hungry Videographer\n\nWebsite and content repository.\n').toString('base64'),
      branch: 'main'
    });
    const ref = await gh(token, 'GET', `/repos/${owner}/${REPO}/git/ref/heads/main`);
    baseSha = ref.object.sha;
    console.log('repo initialized');
  }

  const tree = [];
  let done = 0;
  for (const rel of files) {
    const buf = fs.readFileSync(path.join(root, rel));
    const blob = await gh(token, 'POST', `/repos/${owner}/${REPO}/git/blobs`, {
      content: buf.toString('base64'),
      encoding: 'base64'
    });
    tree.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
    done++;
    if (done % 10 === 0) console.log(' uploaded', done, '/', files.length);
  }

  const newTree = await gh(token, 'POST', `/repos/${owner}/${REPO}/git/trees`, { tree });
  const commit = await gh(token, 'POST', `/repos/${owner}/${REPO}/git/commits`, {
    message: 'Website with Decap CMS',
    tree: newTree.sha,
    parents: baseSha ? [baseSha] : []
  });

  try {
    await gh(token, 'POST', `/repos/${owner}/${REPO}/git/refs`, { ref: 'refs/heads/main', sha: commit.sha });
  } catch (e) {
    await gh(token, 'PATCH', `/repos/${owner}/${REPO}/git/refs/heads/main`, { sha: commit.sha, force: true });
  }

  await gh(token, 'PATCH', `/repos/${owner}/${REPO}`, { default_branch: 'main' }).catch(() => {});
  try { fs.unlinkSync(DEVICE_FILE); } catch {}
  console.log(JSON.stringify({ ok: true, owner, repo: REPO, url: repo.html_url, files: files.length }));
}

const cmd = process.argv[2];
(cmd === 'start' ? start() : cmd === 'finish' ? finish() : Promise.reject(new Error('use start or finish')))
  .catch(err => { console.error('ERROR:', err.message); process.exit(1); });
