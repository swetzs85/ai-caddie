const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9090;
const htmlFile = path.join(__dirname, 'AI-Caddie.html');
const html = fs.readFileSync(htmlFile);

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(html);
});

server.listen(PORT, '0.0.0.0', () => {
  const wifiIP = getWifiIP();
  console.log('');
  console.log('=============================================');
  console.log('  AI CADDIE SERVER IS RUNNING!');
  console.log('=============================================');
  console.log('');
  console.log('  On your iPhone, open Safari and go to:');
  console.log('');
  console.log('  http://' + wifiIP + ':' + PORT);
  console.log('');
  console.log('=============================================');
  console.log('');
  console.log('  IMPORTANT: If Windows showed a firewall');
  console.log('  popup, you MUST click "Allow access"');
  console.log('  (check "Private networks" box)');
  console.log('');
  console.log('  Press Ctrl+C to stop the server.');
  console.log('');
});

function getWifiIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}
