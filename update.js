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

async function updateFile(repoPath, localPath) {
  const getRes = await api('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + repoPath);
  const sha = getRes.data.sha;

  const content = fs.readFileSync(localPath);
  const base64 = content.toString('base64');

  const res = await api('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + repoPath, {
    message: 'Fix relative paths for GitHub Pages',
    content: base64,
    sha: sha,
  });

  if (res.status === 200 || res.status === 201) {
    console.log('  Updated: ' + repoPath);
  } else {
    console.log('  FAILED: ' + res.status + ' ' + JSON.stringify(res.data.message || ''));
  }
}

async function main() {
  console.log('Updating index.html with fixed paths...');
  await updateFile('index.html', path.join(__dirname, 'dist', 'index.html'));

  console.log('\nDone! Wait 1-2 minutes then refresh:');
  console.log('https://swetzs85.github.io/ai-caddie');
}

main().catch(e => console.error('Error:', e.message));
