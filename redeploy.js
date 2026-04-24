const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'YOUR_TOKEN_HERE'; // token removed after deployment
const OWNER = 'swetzs85';
const REPO = 'ai-caddie';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function api(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        'Authorization': 'token ' + TOKEN,
        'User-Agent': 'ai-caddie-deploy',
        'Accept': 'application/vnd.github.v3+json',
      },
    };
    if (body) {
      const data = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function uploadOrUpdate(repoPath, localPath) {
  const content = fs.readFileSync(localPath).toString('base64');
  const getRes = await api('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + repoPath);
  const sha = (getRes.status === 200 && getRes.data && getRes.data.sha) ? getRes.data.sha : null;
  const body = { message: 'Update ' + repoPath, content: content };
  if (sha) body.sha = sha;
  const res = await api('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + repoPath, body);
  if (res.status === 200 || res.status === 201) {
    console.log('  OK: ' + repoPath);
  } else {
    console.log('  FAIL ' + repoPath + ': ' + res.status + ' ' + (res.data.message || ''));
  }
}

async function deleteFile(repoPath) {
  const getRes = await api('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + repoPath);
  if (getRes.status === 200 && getRes.data && getRes.data.sha) {
    await api('DELETE', '/repos/' + OWNER + '/' + REPO + '/contents/' + repoPath, {
      message: 'Remove old file',
      sha: getRes.data.sha,
    });
    console.log('  Deleted: ' + repoPath);
  }
}

async function main() {
  const distDir = path.join(__dirname, 'dist');
  console.log('Deploying AI Caddie v3...\n');

  // Detect the actual JS bundle
  const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
  const newBundle = jsFiles[0];
  console.log('  New bundle: ' + newBundle);

  // ALWAYS fix index.html: correct bundle ref + relative paths (no leading /)
  const htmlPath = path.join(distDir, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Fix bundle reference
  const bundleRef = html.match(/index-[a-f0-9]+\.js/);
  if (!bundleRef || bundleRef[0] !== newBundle) {
    console.log('  FIXING bundle: ' + (bundleRef ? bundleRef[0] : 'none') + ' -> ' + newBundle);
    html = html.replace(/index-[a-f0-9]+\.js/, newBundle);
  }

  // Fix absolute paths -> relative (GitHub Pages serves from /ai-caddie/ not /)
  const before = html;
  html = html.replace(/src="\//g, 'src="');
  html = html.replace(/href="\//g, 'href="');
  if (html !== before) console.log('  FIXING absolute paths -> relative');

  fs.writeFileSync(htmlPath, html);

  // Upload index.html + JS bundle
  await uploadOrUpdate('index.html', htmlPath);
  await uploadOrUpdate('_expo/static/js/web/' + newBundle, path.join(jsDir, newBundle));

  // Upload PWA assets (manifest + icons)
  const pwaFiles = ['manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
  for (const f of pwaFiles) {
    const local = path.join(distDir, f);
    if (fs.existsSync(local)) {
      await uploadOrUpdate(f, local);
    }
  }

  // NOTE: We no longer delete old JS bundles.
  // Cached index.html pages may still reference old bundles,
  // so keeping them ensures users don't see white screens.

  console.log('\n============================================');
  console.log('  DEPLOYED! Wait 1-2 min then refresh:');
  console.log('  https://swetzs85.github.io/ai-caddie');
  console.log('============================================\n');
}

main().catch(e => console.error('Error:', e.message));
