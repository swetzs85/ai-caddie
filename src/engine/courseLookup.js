import { findKnownCourse, formatKnownCourseResult } from '../data/knownCourses';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const GITHUB_COURSES = 'https://raw.githubusercontent.com/swetzs85/ai-caddie/main/courses';
const PROXIES = [
  (url) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
  (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
  (url) => 'https://corsproxy.io/?' + encodeURIComponent(url),
];
const TIMEOUT_MS = 8000;

export async function geocodeCourse(courseName, location) {
  try {
    const q = encodeURIComponent(courseName + ' ' + location + ' golf');
    const r = await fetchWithTimeout(NOMINATIM + '?q=' + q + '&format=json&limit=1', 5000);
    const d = await r.json();
    if (d.length > 0) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch (e) { /* ignore */ }
  try {
    const q = encodeURIComponent(location);
    const r = await fetchWithTimeout(NOMINATIM + '?q=' + q + '&format=json&limit=1', 5000);
    const d = await r.json();
    if (d.length > 0) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch (e) { /* ignore */ }
  return { lat: 42.36, lng: -71.06 };
}

export function buildGolfLinkUrl(courseName, location) {
  const slug = courseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const state = extractState(location);
  const city = extractCity(location);
  if (state && city) return 'https://www.golflink.com/golf-courses/' + state + '/' + city + '/' + slug;
  return null;
}

export async function autoImportCourse(courseName, location) {
  const known = findKnownCourse(courseName, location);
  if (known) return formatKnownCourseResult(known);

  const ghResult = await tryGitHubLibrary(courseName);
  if (ghResult) return ghResult;

  const urls = [];
  const state = extractState(location);
  const city = extractCity(location);
  if (!state || !city) return null;

  const slug = courseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  urls.push('https://www.golflink.com/golf-courses/' + state + '/' + city + '/' + slug);

  for (const alt of generateSlugVariants(courseName)) {
    const u = 'https://www.golflink.com/golf-courses/' + state + '/' + city + '/' + alt;
    if (!urls.includes(u)) urls.push(u);
  }

  for (const url of urls) {
    const result = await raceProxies(url);
    if (result) return result;
  }
  return null;
}

async function tryGitHubLibrary(courseName) {
  try {
    const indexRes = await fetchWithTimeout(GITHUB_COURSES + '/index.json', 5000);
    if (!indexRes.ok) return null;
    const index = await indexRes.json();
    const nameLC = courseName.toLowerCase().trim();
    const match = index.find(c => {
      if (c.name.toLowerCase() === nameLC) return true;
      const slug = nameLC.replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      if (c.slug === slug) return true;
      const words = nameLC.split(/\s+/);
      const cWords = c.name.toLowerCase();
      return words.filter(w => w.length > 2 && cWords.includes(w)).length >= 2;
    });
    if (!match) return null;

    const courseRes = await fetchWithTimeout(GITHUB_COURSES + '/' + match.slug + '.json', 5000);
    if (!courseRes.ok) return null;
    const course = await courseRes.json();

    return {
      holes: course.holes,
      tees: Object.entries(course.tees).map(([name, info]) => ({
        name, rating: info.rating, slope: info.slope, total: info.total,
      })),
      totalPar: course.holes.reduce((s, h) => s + h.par, 0),
      source: 'AI Caddie Course Library',
      websiteUrl: course.websiteUrl || '',
    };
  } catch (e) {
    return null;
  }
}

export async function importFromUrl(url) {
  if (url.includes('golflink.com')) {
    return await raceProxies(url);
  }
  for (const makeProxy of PROXIES) {
    try {
      const html = await fetchHtml(makeProxy(url));
      if (!html) continue;
      const glResult = parseGolfLinkPayload(html);
      if (glResult) return glResult;
      const tableResult = parseHtmlScorecard(html);
      if (tableResult) return tableResult;
    } catch (e) { continue; }
  }
  return null;
}

async function raceProxies(url) {
  const attempts = PROXIES.map(async (makeProxy) => {
    const html = await fetchHtml(makeProxy(url));
    if (!html || html.length < 500) throw new Error('too short');
    const result = parseGolfLinkPayload(html);
    if (!result) throw new Error('no payload');
    return result;
  });

  try {
    return await Promise.any(attempts);
  } catch (e) {
    return null;
  }
}

async function fetchHtml(proxyUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function extractBalancedJSON(html, marker) {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = html.indexOf('{', idx);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) return html.substring(start, i + 1); }
  }
  return null;
}

function parseGolfLinkPayload(html) {
  const jsonStr = extractBalancedJSON(html, 'PayloadJson');
  if (!jsonStr) return null;
  try {
    const payload = JSON.parse(jsonStr);
    if (!payload.Tees || payload.Tees.length === 0) return null;
    const numHoles = payload.Tees[0].Holes || 18;
    const tees = [];
    const holesData = [];

    const holeGps = extractHoleGps(payload.Points, numHoles);

    for (let h = 1; h <= numHoles; h++) {
      holesData.push({
        number: h, par: payload.Tees[0]['Par' + h] || 4, yardages: {},
        handicap: { men: h, women: h },
        shape: 'straight', elevation: 'flat',
        hazards: [], description: '', strategy: '', imageUrl: '',
        gps: holeGps[h - 1] || null,
      });
    }
    for (const tee of payload.Tees) {
      if (!tee.Active) continue;
      tees.push({ name: tee.TeeName, rating: tee.Rating || 72, slope: tee.Slope || 130, total: tee.Length || 0 });
      for (let h = 1; h <= numHoles; h++) holesData[h - 1].yardages[tee.TeeName] = tee['Len' + h] || 0;
    }
    const courseId = payload.Tees[0].CourseId || null;
    return { holes: holesData, tees, totalPar: payload.Tees[0].Par || 72, source: 'GolfLink (auto-imported)', courseId };
  } catch (e) { return null; }
}

function extractHoleGps(points, numHoles) {
  if (!points || points.length === 0) return [];
  const holeGps = [];
  const pointsPerHole = 4;
  for (let h = 0; h < numHoles; h++) {
    const base = h * pointsPerHole;
    if (base >= points.length) { holeGps.push(null); continue; }
    const tee = points[base]?.Position;
    const green = points[Math.min(base + pointsPerHole - 1, points.length - 1)]?.Position;
    if (tee && green) {
      holeGps.push({
        tee: { lat: tee.Latitude, lng: tee.Longitude },
        green: { lat: green.Latitude, lng: green.Longitude },
        center: {
          lat: (tee.Latitude + green.Latitude) / 2,
          lng: (tee.Longitude + green.Longitude) / 2,
        },
      });
    } else {
      holeGps.push(null);
    }
  }
  return holeGps;
}

export function getSatelliteUrl(gps, zoom) {
  if (!gps || !gps.center) return null;
  const z = zoom || 17;
  return 'https://www.google.com/maps/@' + gps.center.lat + ',' + gps.center.lng + ',' + z + 'z/data=!3m1!1e1';
}

function parseHtmlScorecard(html) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells = [];
    const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cells.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
    }
    if (cells.length >= 5) rows.push(cells);
  }
  if (rows.length < 2) return null;
  return parseRowData(rows);
}

function parseRowData(rows) {
  const holes = [];
  const tees = [];
  for (let h = 1; h <= 18; h++) holes.push({ number: h, par: 4, yardages: {}, handicap: { men: h, women: h }, shape: 'straight', elevation: 'flat', hazards: [], description: '', strategy: '' });

  for (const cells of rows) {
    const label = cells[0].toLowerCase().replace(/[^a-z0-9\s()]/g, '').trim();
    const nums = cells.slice(1).map(c => parseInt(c.replace(/[^0-9]/g, ''))).filter(n => !isNaN(n));
    if (nums.length < 4) continue;
    if (label.includes('par') || label === 'par') {
      const pars = nums.filter(n => n >= 3 && n <= 5);
      pars.forEach((p, i) => { if (i < 18) holes[i].par = p; });
      continue;
    }
    if (label.match(/^(hdcp|hcp|handicap)/)) {
      nums.filter(n => n >= 1 && n <= 18).forEach((h, i) => { if (i < 18) holes[i].handicap = { men: h, women: h }; });
      continue;
    }
    if (label.match(/^(out|in|total|front|back|\d+$)/) || label === '') continue;
    const yards = nums.filter(n => n >= 50 && n <= 700);
    if (yards.length >= 9) {
      const teeName = cells[0].trim();
      if (!tees.find(t => t.name === teeName)) tees.push({ name: teeName, rating: 72, slope: 130, total: yards.reduce((a, b) => a + b, 0) });
      yards.forEach((y, i) => { if (i < 18) holes[i].yardages[teeName] = y; });
    }
  }
  if (!holes.some(h => Object.keys(h.yardages).length > 0)) return null;
  return { holes, tees, totalPar: holes.reduce((s, h) => s + h.par, 0), source: 'Website (auto-imported)' };
}

export function parsePastedScorecard(text) {
  if (text.includes('<tr') || text.includes('<td') || text.includes('<th')) {
    const result = parseHtmlScorecard(text);
    if (result) return { holes: result.holes, teeNames: result.tees.map(t => t.name), tees: result.tees };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const holes = [];
  const teeNames = [];
  const teeData = [];
  for (let h = 1; h <= 18; h++) holes.push({ number: h, par: 4, yardages: {} });

  for (const line of lines) {
    const parts = line.split(/[\t|,]+|\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length < 5) continue;
    const nums = parts.slice(1).map(p => parseInt(p.replace(/[^0-9]/g, ''))).filter(n => !isNaN(n));
    if (nums.length < 4) continue;
    const label = parts[0].toLowerCase().replace(/[^a-z0-9\s()]/g, '').trim();

    if (label.includes('par') || label === 'par') {
      nums.filter(n => n >= 3 && n <= 5).forEach((p, i) => { if (i < 18) holes[i].par = p; });
      continue;
    }
    if (label.match(/^(hdcp|hcp|handicap)/)) {
      nums.filter(n => n >= 1 && n <= 18).forEach((h, i) => { if (i < 18) holes[i].handicap = { men: h, women: h }; });
      continue;
    }
    if (label.match(/^(out|in|total|front|back|\d+$)/) || label === '') continue;
    const yards = nums.filter(n => n >= 50 && n <= 700);
    if (yards.length >= 9) {
      const teeName = parts[0].trim();
      if (!teeNames.includes(teeName)) teeNames.push(teeName);
      teeData.push({ name: teeName, rating: 72, slope: 130, total: yards.reduce((a, b) => a + b, 0) });
      yards.forEach((y, i) => { if (i < 18) holes[i].yardages[teeName] = y; });
    }
  }

  if (!holes.some(h => Object.keys(h.yardages).length > 0) &&
      holes.every(h => h.par === 4)) return null;

  return { holes, teeNames, tees: teeData };
}

export function buildSearchUrl(courseName, location) {
  return 'https://www.google.com/search?q=' + encodeURIComponent(courseName + ' ' + location + ' golf scorecard yardages');
}

function extractState(location) {
  const parts = location.split(',').map(p => p.trim());
  if (parts.length < 2) return null;
  const raw = parts[parts.length - 1].toLowerCase().trim();
  const map = {
    'al':'al','alabama':'al','ak':'ak','alaska':'ak','az':'az','arizona':'az','ar':'ar','arkansas':'ar',
    'ca':'ca','california':'ca','co':'co','colorado':'co','ct':'ct','connecticut':'ct','de':'de','delaware':'de',
    'fl':'fl','florida':'fl','ga':'ga','georgia':'ga','hi':'hi','hawaii':'hi','id':'id','idaho':'id',
    'il':'il','illinois':'il','in':'in','indiana':'in','ia':'ia','iowa':'ia','ks':'ks','kansas':'ks',
    'ky':'ky','kentucky':'ky','la':'la','louisiana':'la','me':'me','maine':'me','md':'md','maryland':'md',
    'ma':'ma','massachusetts':'ma','mi':'mi','michigan':'mi','mn':'mn','minnesota':'mn','ms':'ms','mississippi':'ms',
    'mo':'mo','missouri':'mo','mt':'mt','montana':'mt','ne':'ne','nebraska':'ne','nv':'nv','nevada':'nv',
    'nh':'nh','new hampshire':'nh','nj':'nj','new jersey':'nj','nm':'nm','new mexico':'nm','ny':'ny','new york':'ny',
    'nc':'nc','north carolina':'nc','nd':'nd','north dakota':'nd','oh':'oh','ohio':'oh','ok':'ok','oklahoma':'ok',
    'or':'or','oregon':'or','pa':'pa','pennsylvania':'pa','ri':'ri','rhode island':'ri','sc':'sc','south carolina':'sc',
    'sd':'sd','south dakota':'sd','tn':'tn','tennessee':'tn','tx':'tx','texas':'tx','ut':'ut','utah':'ut',
    'vt':'vt','vermont':'vt','va':'va','virginia':'va','wa':'wa','washington':'wa','wv':'wv','west virginia':'wv',
    'wi':'wi','wisconsin':'wi','wy':'wy','wyoming':'wy',
  };
  return map[raw] || raw;
}

function extractCity(location) {
  const parts = location.split(',').map(p => p.trim());
  return parts[0].toLowerCase().replace(/\s+/g, '-');
}

function generateSlugVariants(name) {
  const base = name.toLowerCase();
  const slugs = [base.replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')];
  const noSuffix = base.replace(/\s*(golf\s*)?(club|course|resort|links|country club|cc)$/i, '').trim();
  slugs.push(noSuffix.replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''));
  const withCC = base.replace(/country\s+club/i, 'cc');
  slugs.push(withCC.replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''));
  return [...new Set(slugs)];
}

let _ghIndexCache = null;
let _ghIndexTime = 0;

async function getGitHubIndex() {
  if (_ghIndexCache && Date.now() - _ghIndexTime < 300000) return _ghIndexCache;
  try {
    const res = await fetchWithTimeout(GITHUB_COURSES + '/index.json', 4000);
    if (res.ok) {
      _ghIndexCache = await res.json();
      _ghIndexTime = Date.now();
    }
  } catch { /* ignore */ }
  return _ghIndexCache || [];
}

function formatNominatimAddress(item) {
  const addr = item.address || {};
  const city = addr.city || addr.town || addr.village || addr.hamlet || '';
  const state = addr.state || '';
  if (city && state) return city + ', ' + state;
  if (state) return state;
  return item.display_name.split(',').slice(1, 3).map(s => s.trim()).join(', ');
}

export async function searchGolfCourses(query) {
  if (!query || query.trim().length < 3) return [];
  const q = query.trim().toLowerCase();
  const results = [];
  const seen = new Set();

  const ghIndex = await getGitHubIndex();
  for (const c of ghIndex) {
    const name = c.name.toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 1);
    const matches = words.filter(w => name.includes(w)).length;
    if (matches >= 1 && matches >= words.length * 0.5) {
      results.push({
        name: c.name, location: c.location || '',
        lat: c.lat || null, lng: c.lng || null,
        source: 'library', slug: c.slug,
      });
      seen.add(c.name.toLowerCase());
    }
  }

  try {
    const url = NOMINATIM + '?q=' + encodeURIComponent(query + ' golf course')
      + '&format=json&limit=6&addressdetails=1';
    const res = await fetchWithTimeout(url, 4000);
    if (res.ok) {
      const data = await res.json();
      for (const item of data) {
        const name = item.display_name.split(',')[0].trim();
        if (seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        results.push({
          name,
          location: formatNominatimAddress(item),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          source: 'nominatim',
        });
      }
    }
  } catch { /* ignore */ }

  return results.slice(0, 8);
}
