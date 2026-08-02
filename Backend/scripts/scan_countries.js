/**
 * IPTV Country Scanner - Quét M3U từng quốc gia, đếm kênh mỗi nước
 * node scripts/scan_countries.js [--limit=10]
 */
const fs = require('fs');
const path = require('path');

const CONFIG = {
  concurrency: 10,
  countriesUrl: 'https://iptv-org.github.io/api/countries.json',
  outputDir: path.join(__dirname, '..', 'scan_results'),
};

const args = process.argv.slice(2);
const limitFilter = Math.abs(parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1])) || 0;

function getFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...code.split('').map(c => 127397 + c.charCodeAt(0)));
}

function parseM3U(text) {
  const channels = [];
  const lines = text.split('\n');
  let current = null;
  const seen = new Set();

  for (const rawLine of lines) {
    const line = rawLine.replace('\r', '').trim();
    if (!line || line.startsWith('#EXTVLCOPT') || line.startsWith('#KODIPROP') || line.startsWith('#EXTM3U')) continue;
    if (line.startsWith('#EXTINF:')) {
      const lastComma = line.lastIndexOf(',');
      const name = lastComma >= 0 ? line.substring(lastComma + 1).trim() : 'Unknown';
      if (/(geo-blocked|not 24\/7|offline|discontinued|blocked|dead)/i.test(name)) { current = null; continue; }
      const groupMatch = line.match(/group-title="([^"]+)"/);
      current = { name: name.replace(/\s+/g,' ').trim(), group: groupMatch ? groupMatch[1] : '' };
    } else if (line.startsWith('http') && current) {
      const url = line.split(/[\s"'\r\n]/)[0].trim();
      const key = url + '|' + current.name;
      if (!seen.has(key)) { seen.add(key); channels.push(current); }
      current = null;
    }
  }
  return channels;
}

async function fetchM3U(url, timeout = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch { clearTimeout(t); return null; }
}

async function main() {
  console.log('╔══════════════════════════════════╗');
  console.log('║   IPTV COUNTRY SCANNER          ║');
  console.log('╚══════════════════════════════════╝\n');

  if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  console.log('[1/2] Lấy danh sách quốc gia...');
  const r = await fetch(CONFIG.countriesUrl, { signal: AbortSignal.timeout(15000) });
  const data = await r.json();
  const countries = data.map(c => ({
    code: c.code.toUpperCase(),
    name: c.name,
    flag: c.flag || getFlag(c.code),
  }));
  console.log(`  -> ${countries.length} quốc gia\n`);

  let target = countries;
  if (limitFilter > 0) target = target.slice(0, limitFilter);

  console.log('[2/5] Quét M3U từng quốc gia...\n');

  const results = [];
  const queue = [...target];
  let done = 0;
  const total = queue.length;
  const start = Date.now();
  let totalChannels = 0;

  const worker = async () => {
    while (queue.length > 0) {
      const c = queue.shift();
      const text = await fetchM3U(`https://iptv-org.github.io/iptv/countries/${c.code.toLowerCase()}.m3u`);
      const count = text ? parseM3U(text).length : 0;
      results.push({ ...c, channels: count });
      totalChannels += count;
      done++;
      const pct = ((done / total) * 100).toFixed(1);
      const el = Math.floor((Date.now() - start) / 1000);
      const barLen = 40;
      const filled = Math.round((done / total) * barLen);
      const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLen - filled);
      process.stdout.write(`\r  ${bar} ${done}/${total} ${pct}% | ${el}s | ${c.flag || ''} ${c.code} ${count} kênh          `);
    }
  };

  const workers = Array(CONFIG.concurrency).fill(null).map(() => worker());
  await Promise.all(workers);
  process.stdout.write('\n\n');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Hoàn thành / ${elapsed}s`);

  // Sort
  results.sort((a, b) => b.channels - a.channels);

  console.log(`\n┌─────────────────────────────────────┐`);
  console.log(`│ KẾT QUẢ QUÉT ${total} QUỐC GIA: ${totalChannels.toLocaleString()} kênh tổng│`);
  console.log(`├─────────────────────────────────────┤`);
  results.filter(r => r.channels > 0).forEach((r, i) => {
    console.log(`│ ${String(i+1).padStart(3)}. ${r.flag||' '} ${r.code.padEnd(3)} ${String(r.channels).padStart(5)} kênh  ${r.name.substring(0,25).padEnd(25)}│`);
  });
  console.log(`└─────────────────────────────────────┘`);

  const empty = results.filter(r => r.channels === 0);
  if (empty.length > 0) {
    console.log(`\n  Quốc gia không có kênh: ${empty.length} nước`);
  }

  // Save
  const ts = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
  const out = {
    scanned: new Date().toISOString(),
    total_countries: results.length,
    countries_with_channels: results.filter(r => r.channels > 0).length,
    total_channels: totalChannels,
    top_20: results.slice(0, 20).map(r => ({ code: r.code, name: r.name, flag: r.flag, channels: r.channels })),
    all: results,
  };
  const p = path.join(CONFIG.outputDir, `countries_scan_${ts}.json`);
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`\n📄 ${p}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });