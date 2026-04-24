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

async function main() {
  console.log('Adding .nojekyll file to fix _expo folder...');

  const content = Buffer.from('').toString('base64');
  const res = await api('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/.nojekyll', {
    message: 'Add .nojekyll to serve _expo directory',
    content: 'Cg==',
  });

  if (res.status === 201 || res.status === 200) {
    console.log('  .nojekyll added!');
  } else if (res.status === 422) {
    console.log('  .nojekyll already exists');
  } else {
    console.log('  Result: ' + res.status + ' ' + JSON.stringify(res.data.message || ''));
  }

  console.log('\nDone! Wait 1-2 minutes then try:');
  console.log('https://swetzs85.github.io/ai-caddie');
}

main().catch(e => console.error('Error:', e.message));
