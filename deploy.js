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

async function uploadFile(filePath, repoPath) {
  const content = fs.readFileSync(filePath);
  const base64 = content.toString('base64');
  const res = await api('PUT', `/repos/${OWNER}/${REPO}/contents/${repoPath}`, {
    message: 'Add ' + repoPath,
    content: base64,
  });
  if (res.status === 201 || res.status === 200) {
    console.log('  Uploaded: ' + repoPath);
  } else {
    console.log('  FAILED ' + repoPath + ': ' + res.status + ' ' + JSON.stringify(res.data.message || ''));
  }
}

async function main() {
  console.log('Step 1: Creating repository...');
  const createRes = await api('POST', '/user/repos', {
    name: REPO,
    description: 'AI Caddie - Golf Strategy App',
    public: true,
    auto_init: false,
  });
  if (createRes.status === 201) {
    console.log('  Repository created!');
  } else if (createRes.status === 422) {
    console.log('  Repository already exists, continuing...');
  } else {
    console.log('  Create result: ' + createRes.status + ' ' + JSON.stringify(createRes.data));
  }

  console.log('\nStep 2: Uploading app files...');
  const distDir = path.join(__dirname, 'dist');

  await uploadFile(path.join(distDir, 'index.html'), 'index.html');

  const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
  const jsFiles = fs.readdirSync(jsDir);
  for (const f of jsFiles) {
    await uploadFile(path.join(jsDir, f), '_expo/static/js/web/' + f);
  }

  const assetsBase = path.join(distDir, 'assets', 'node_modules', '@react-navigation', 'elements', 'lib', 'module', 'assets');
  if (fs.existsSync(assetsBase)) {
    const assetFiles = fs.readdirSync(assetsBase);
    for (const f of assetFiles) {
      const fp = path.join(assetsBase, f);
      if (fs.statSync(fp).isFile()) {
        await uploadFile(fp, 'assets/node_modules/@react-navigation/elements/lib/module/assets/' + f);
      }
    }
  }

  if (fs.existsSync(path.join(distDir, 'favicon.ico'))) {
    await uploadFile(path.join(distDir, 'favicon.ico'), 'favicon.ico');
  }
  if (fs.existsSync(path.join(distDir, 'manifest.json'))) {
    await uploadFile(path.join(distDir, 'manifest.json'), 'manifest.json');
  }

  console.log('\nStep 3: Enabling GitHub Pages...');
  const pagesRes = await api('POST', `/repos/${OWNER}/${REPO}/pages`, {
    source: { branch: 'main', path: '/' },
  });
  if (pagesRes.status === 201 || pagesRes.status === 409) {
    console.log('  GitHub Pages enabled!');
  } else {
    console.log('  Pages result: ' + pagesRes.status + ' ' + JSON.stringify(pagesRes.data));
  }

  console.log('\n============================================');
  console.log('  DONE! Your app will be live at:');
  console.log('  https://' + OWNER + '.github.io/' + REPO);
  console.log('============================================');
  console.log('\n  It takes 1-2 minutes for GitHub to');
  console.log('  publish. Then open that URL on your');
  console.log('  iPhone in Safari!\n');
}

main().catch(e => console.error('Error:', e.message));
