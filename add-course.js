const https = require('https');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const OWNER = 'swetzs85';
const REPO = 'ai-caddie';
const TOKEN = 'YOUR_TOKEN_HERE';

async function ghApi(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: '/repos/' + OWNER + '/' + REPO + endpoint,
      method, headers: {
        'Authorization': 'token ' + TOKEN,
        'User-Agent': 'AI-Caddie-Deployer',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function uploadCourse(jsonFile) {
  const filePath = path.resolve(jsonFile);
  const content = fs.readFileSync(filePath, 'utf8');
  const course = JSON.parse(content);
  const slug = path.basename(jsonFile, '.json');
  const ghPath = 'courses/' + slug + '.json';

  console.log('Uploading ' + course.name + ' (' + slug + ')...');

  const existing = await ghApi('GET', '/contents/' + ghPath);
  const sha = existing.status === 200 ? existing.data.sha : undefined;

  const result = await ghApi('PUT', '/contents/' + ghPath, {
    message: 'Add course: ' + course.name,
    content: Buffer.from(content).toString('base64'),
    sha,
  });

  if (result.status === 200 || result.status === 201) {
    console.log('  OK: ' + ghPath);
  } else {
    console.log('  FAIL: ' + result.status, result.data.message);
    return;
  }

  await updateIndex();
  console.log('\nDone! Course available at:');
  console.log('  https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/main/courses/' + slug + '.json');
}

async function updateIndex() {
  const coursesDir = path.join(__dirname, 'courses');
  const files = fs.readdirSync(coursesDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  const index = [];

  for (const file of files) {
    const course = JSON.parse(fs.readFileSync(path.join(coursesDir, file), 'utf8'));
    index.push({
      slug: path.basename(file, '.json'),
      name: course.name,
      location: course.location,
    });
  }

  const indexContent = JSON.stringify(index, null, 2);
  fs.writeFileSync(path.join(coursesDir, 'index.json'), indexContent);

  const existing = await ghApi('GET', '/contents/courses/index.json');
  const sha = existing.status === 200 ? existing.data.sha : undefined;

  const result = await ghApi('PUT', '/contents/courses/index.json', {
    message: 'Update course index',
    content: Buffer.from(indexContent).toString('base64'),
    sha,
  });

  if (result.status === 200 || result.status === 201) {
    console.log('  OK: courses/index.json (' + index.length + ' courses)');
  }
}

const file = process.argv[2];
if (!file) {
  console.log('Usage: node add-course.js courses/my-course.json');
  console.log('  (Set TOKEN in the script first)');
  process.exit(1);
}

uploadCourse(file);
