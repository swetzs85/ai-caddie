const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const jsFile = path.join(distDir, '_expo', 'static', 'js', 'web', 'index-1426a981e6edfd6cf39b416b86914862.js');

const jsContent = fs.readFileSync(jsFile, 'utf-8');

const html = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'  <head>\n' +
'    <meta charset="utf-8" />\n' +
'    <meta http-equiv="X-UA-Compatible" content="IE=edge" />\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no" />\n' +
'    <title>AI Caddie</title>\n' +
'    <meta name="apple-mobile-web-app-capable" content="yes" />\n' +
'    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n' +
'    <meta name="apple-mobile-web-app-title" content="AI Caddie" />\n' +
'    <meta name="theme-color" content="#1B5E20" />\n' +
'    <style>\n' +
'      html, body { height: 100%; margin: 0; padding: 0; }\n' +
'      body { overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; }\n' +
'      #root { display: flex; height: 100%; flex: 1; }\n' +
'    </style>\n' +
'  </head>\n' +
'  <body>\n' +
'    <noscript>You need to enable JavaScript to run this app.</noscript>\n' +
'    <div id="root"></div>\n' +
'    <script>' + jsContent + '</script>\n' +
'  </body>\n' +
'</html>';

const outPath = path.join(__dirname, 'AI-Caddie.html');
fs.writeFileSync(outPath, html, 'utf-8');
const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
console.log('Created: ' + outPath + ' (' + sizeKB + ' KB)');
