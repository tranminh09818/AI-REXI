/**
 * GitHub Trending Routes
 * 
 * GET    /api/admin/github/trending          - Lấy danh sách trending repos
 * GET    /api/admin/github/search            - Tìm kiếm repos theo keyword
 * GET    /api/admin/github/repo/:owner/:name - Chi tiết 1 repo
 * GET    /api/admin/github/saved             - Danh sách repos đã lưu
 * POST   /api/admin/github/saved             - Lưu 1 repo
 * DELETE /api/admin/github/saved/:owner/:name - Bỏ lưu 1 repo
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use(adminMiddleware);

const {
  getCachedRepos, getCacheStatus, scrapeTrending, cacheRepos,
  getUnreadCount, getNotifications, markAsRead, generateRepoSummaries,
  getCachedSummary, saveSummary, snapshotSavedRepoStars, sendDailyDigest,
  getTelegramConfig, getEmailConfig,
} = require('../github-trending-scheduler');

const GITHUB_API = 'https://api.github.com';
let GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_KEY || '';

// ─── SQLite storage cho repos đã lưu ───────────────────────
const DB_PATH = path.join(__dirname, '..', '..', '..', 'Database', 'tro_ly_ai.db');
let db;
try {
  db = new (require('better-sqlite3'))(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS saved_repos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT UNIQUE NOT NULL,
    owner TEXT,
    name TEXT,
    description TEXT,
    language TEXT,
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    stars_gained INTEGER DEFAULT 0,
    period TEXT DEFAULT '',
    url TEXT,
    saved_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`);
} catch (e) { db = null; }
function getDB() {
  if (!db) { try { db = new (require('better-sqlite3'))(DB_PATH); } catch (e) { return null; } }
  return db;
}

// Load GitHub token from DB if not in env
if (!GITHUB_TOKEN && db) {
  try {
    const row = db.prepare("SELECT gia_tri_khoa FROM khoa_api WHERE ten_nha_cung_cap = 'github'").get();
    if (row && row.gia_tri_khoa) GITHUB_TOKEN = row.gia_tri_khoa;
  } catch (e) { /* ignore */ }
}

async function githubFetch(path, token) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'AI-REXI-Admin',
  };
  const authToken = token || GITHUB_TOKEN;
  if (authToken) headers['Authorization'] = `token ${authToken}`;
  
  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Trending Repos (scrape github.com/trending) ────────────
router.get('/trending', async (req, res) => {
  try {
    const { language = '', since = 'daily' } = req.query;
    
    let url = `https://github.com/trending`;
    if (language) url += `/${encodeURIComponent(language)}`;
    url += `?since=${since}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    if (!response.ok) throw new Error(`GitHub Trending fetch failed: ${response.status}`);
    
    const html = await response.text();
    
    // Parse trending repos from HTML
    const repos = [];
    const rows = html.split(/class="Box-row"/).slice(1);
    
    for (const row of rows) {
      try {
        // Repo name — find /owner/repo href (skip login/sponsors)
        const allHrefs = [...row.matchAll(/href="\/([^"]+)"/g)];
        let fullName = '';
        for (const m of allHrefs) {
          const candidate = m[1].replace(/^\/+/, '');
          const parts = candidate.split('/');
          if (parts.length === 2 && !candidate.includes('login') && !candidate.includes('signup') && !candidate.includes('sponsors')) {
            fullName = candidate;
            break;
          }
        }
        if (!fullName) continue;
        
        // Description — single <p> contains everything, description is at the end
        const allParas = [...row.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)];
        let description = '';
        for (const p of allParas) {
          const text = p[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          if (text.length > 5) {
            const nameParts = fullName.split('/');
            const repoLabel = `${nameParts[0]} / ${nameParts[1]}`;
            const idx = text.indexOf(repoLabel);
            if (idx >= 0) {
              description = text.substring(idx + repoLabel.length).trim();
            } else {
              description = text;
            }
          }
        }
        
        // Language
        const langMatch = row.match(/itemprop="programmingLanguage">\s*(.*?)\s*</);
        const languageName = langMatch ? langMatch[1].trim() : '';
        
        // Stars gained (e.g. "2,657 stars today" or "496 stars this week")
        const starsTodayMatch = row.match(/([\d,]+)\s+stars?\s+(today|this week|this month)/i);
        const starsGained = starsTodayMatch ? parseInt(starsTodayMatch[1].replace(/,/g, '')) : 0;
        const period = starsTodayMatch ? starsTodayMatch[2] : '';
        
        // Total stars — get the number between last > and </a> in stargazers link
        let totalStars = 0;
        const starsLinkMatch = row.match(/href="[^"]*\/stargazers"[\s\S]*?<\/a>/);
        if (starsLinkMatch) {
          const noSvg = starsLinkMatch[0].replace(/<svg[\s\S]*?<\/svg>/g, '');
          const numInLink = noSvg.match(/>\s*([\d,]+)\s*<\/a>/);
          if (numInLink) totalStars = parseInt(numInLink[1].replace(/,/g, ''));
        }
        
        // Forks — get the number between last > and </a> in forks link
        let forks = 0;
        const forksLinkMatch = row.match(/href="[^"]*\/forks"[\s\S]*?<\/a>/);
        if (forksLinkMatch) {
          const noSvg = forksLinkMatch[0].replace(/<svg[\s\S]*?<\/svg>/g, '');
          const numInLink = noSvg.match(/>\s*([\d,]+)\s*<\/a>/);
          if (numInLink) forks = parseInt(numInLink[1].replace(/,/g, ''));
        }
        
        // Built by (avatars)
        const builtByMatch = row.match(/Built by([\s\S]*?)<\/div>/);
        const contributors = [];
        if (builtByMatch) {
          const avatarMatches = builtByMatch[1].matchAll(/alt="@([^"]+)"/g);
          for (const m of avatarMatches) {
            contributors.push(m[1]);
          }
        }
        
        repos.push({
          rank: repos.length + 1,
          full_name: fullName,
          owner: fullName.split('/')[0],
          name: fullName.split('/')[1],
          description,
          language: languageName,
          stars: totalStars,
          forks,
          stars_gained: starsGained,
          period,
          url: `https://github.com/${fullName}`,
          contributors: contributors.slice(0, 5),
        });
      } catch (e) {
        continue;
      }
    }
    
    // Enrich with GitHub API data (topics + better description) — top 15 only
    const toEnrich = repos.slice(0, 15);
    await Promise.allSettled(toEnrich.map(async (repo) => {
      try {
        const data = await githubFetch(`/repos/${repo.owner}/${repo.name}`);
        repo.description = data.description || repo.description;
        repo.topics = data.topics || [];
        repo.homepage = data.homepage || '';
        repo.license = data.license?.spdx_id || '';
        repo.stars = data.stargazers_count || repo.stars;
        repo.forks = data.forks_count || repo.forks;
        repo.open_issues = data.open_issues_count || 0;
        repo.watchers = data.watchers_count || 0;
        repo.size = data.size || 0;
        repo.created_at = data.created_at || '';
        repo.updated_at = data.updated_at || '';
        repo.pushed_at = data.pushed_at || '';
      } catch (e) { /* skip */ }
    }));
    
    // Generate AI summaries for repos that don't have one yet
    const reposNeedingSummary = repos.filter(r => !r.ai_summary);
    if (reposNeedingSummary.length > 0) {
      try {
        await generateRepoSummaries(reposNeedingSummary);
      } catch (e) {
        console.error('[GitHub Trending] AI summary generation failed:', e.message);
      }
    }
    
    res.json({ success: true, repos, since, language });
  } catch (error) {
    console.error('[GitHub Trending Error]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Search Repos ───────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q, sort = 'stars', order = 'desc', per_page = 20, page = 1 } = req.query;
    
    if (!q) return res.status(400).json({ success: false, error: 'Missing query parameter "q"' });
    
    const data = await githubFetch(
      `/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=${order}&per_page=${per_page}&page=${page}`
    );
    
    const repos = data.items.map(r => ({
      id: r.id,
      full_name: r.full_name,
      owner: r.owner.login,
      name: r.name,
      description: r.description || '',
      language: r.language || '',
      stars: r.stargazers_count,
      forks: r.forks_count,
      open_issues: r.open_issues_count,
      watchers: r.watchers_count,
      url: r.html_url,
      homepage: r.homepage || '',
      topics: r.topics || [],
      created_at: r.created_at,
      updated_at: r.updated_at,
      pushed_at: r.pushed_at,
      license: r.license?.spdx_id || 'None',
      archived: r.archived,
      fork: r.fork,
    }));
    
    res.json({
      success: true,
      total_count: data.total_count,
      repos,
      page: Number(page),
      per_page: Number(per_page),
    });
  } catch (error) {
    console.error('[GitHub Search Error]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Danh sách repos đã lưu ─────────────────────────────────
router.get('/saved', (req, res) => {
  const d = getDB();
  if (!d) return res.json({ success: false, error: 'DB not available' });
  const rows = d.prepare('SELECT * FROM saved_repos ORDER BY saved_at DESC').all();
  res.json({ success: true, repos: rows });
});

// ─── Lưu 1 repo ─────────────────────────────────────────────
router.post('/saved', (req, res) => {
  const d = getDB();
  if (!d) return res.json({ success: false, error: 'DB not available' });
  const {
    full_name, owner, name, description, language,
    stars = 0, forks = 0, stars_gained = 0, period = '', url
  } = req.body || {};

  if (!full_name) return res.status(400).json({ success: false, error: 'Missing full_name' });

  try {
    const stmt = d.prepare(`
      INSERT INTO saved_repos (full_name, owner, name, description, language, stars, forks, stars_gained, period, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(full_name) DO UPDATE SET
        description = excluded.description,
        language = excluded.language,
        stars = excluded.stars,
        forks = excluded.forks,
        stars_gained = excluded.stars_gained,
        period = excluded.period,
        url = excluded.url
    `);
    stmt.run(full_name, owner || full_name.split('/')[0], name || full_name.split('/')[1],
      description || '', language || '', stars, forks, stars_gained, period, url || `https://github.com/${full_name}`);
    res.json({ success: true, message: `Đã lưu ${full_name}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Bỏ lưu 1 repo ──────────────────────────────────────────
router.delete('/saved/:owner/:name', (req, res) => {
  const d = getDB();
  if (!d) return res.json({ success: false, error: 'DB not available' });
  const fullName = `${req.params.owner}/${req.params.name}`;
  try {
    const info = d.prepare('DELETE FROM saved_repos WHERE full_name = ?').run(fullName);
    res.json({ success: true, deleted: info.changes > 0 });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Repo Detail ────────────────────────────────────────────
router.get('/repo/:owner/:name', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const data = await githubFetch(`/repos/${owner}/${name}`);
    
    // README (base64) + contributors + latest release — best effort, don't fail the whole call
    let readme = '', readmeBase64 = false;
    let contributors = [], latestRelease = null, totalStars;
    await Promise.allSettled([
      (async () => {
        try {
          const rm = await githubFetch(`/repos/${owner}/${name}/readme`);
          if (rm && rm.content) { readme = rm.content; readmeBase64 = true; }
        } catch (e) { /* no readme */ }
      })(),
      (async () => {
        try {
          const c = await githubFetch(`/repos/${owner}/${name}/contributors?per_page=10&anon=1`);
          contributors = (c || []).map(u => ({ login: u.login || 'anonymous', avatar_url: u.avatar_url, contributions: u.contributions }));
        } catch (e) { /* skip */ }
      })(),
      (async () => {
        try {
          const rel = await githubFetch(`/repos/${owner}/${name}/releases/latest`);
          latestRelease = { tag_name: rel.tag_name, name: rel.name, published_at: rel.published_at, body: rel.body };
        } catch (e) { /* no release */ }
      })(),
    ]);
    try {
      const st = await githubFetch(`/repos/${owner}/${name}/stargazers?per_page=1&page=1`);
      totalStars = Array.isArray(st) ? st.length : 0;
    } catch (e) { totalStars = data.stargazers_count; }

    const aiSummary = getCachedSummary(data.full_name);

    res.json({
      success: true,
      repo: {
        id: data.id,
        full_name: data.full_name,
        description: data.description || '',
        language: data.language || '',
        stars: data.stargazers_count,
        forks: data.forks_count,
        open_issues: data.open_issues_count,
        watchers: data.watchers_count,
        size: data.size,
        url: data.html_url,
        homepage: data.homepage || '',
        topics: data.topics || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
        pushed_at: data.pushed_at,
        license: data.license?.name || 'None',
        default_branch: data.default_branch,
        archived: data.archived,
        owner_avatar: data.owner?.avatar_url || '',
        owner_html_url: data.owner?.html_url || '',
        readme,
        readme_base64: readmeBase64,
        contributors,
        latest_release: latestRelease,
        ai_summary: aiSummary || '',
      },
    });
  } catch (error) {
    console.error('[GitHub Repo Error]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Star growth history ───────────────────────────────────
router.get('/stars/:owner/:name/history', (req, res) => {
  const d = getDB();
  if (!d) return res.json({ success: true, points: [] });
  const fullName = `${req.params.owner}/${req.params.name}`;
  try {
    const rows = d.prepare(
      'SELECT stars, created_at FROM star_snapshots WHERE full_name = ? ORDER BY created_at ASC'
    ).all(fullName);
    res.json({ success: true, points: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Export saved repos ────────────────────────────────────
router.get('/export/saved', (req, res) => {
  const d = getDB();
  if (!d) return res.status(500).json({ success: false, error: 'DB not available' });
  const { format = 'json' } = req.query;
  try {
    const rows = d.prepare('SELECT * FROM saved_repos ORDER BY saved_at DESC').all();
    const filename = `github-saved-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      const headers = ['full_name', 'owner', 'name', 'description', 'language', 'stars', 'forks', 'stars_gained', 'period', 'url', 'saved_at'];
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send('\uFEFF' + csv);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    return res.send(JSON.stringify(rows, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Export starred repos ──────────────────────────────────
router.get('/export/starred', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const response = await fetch('https://api.github.com/user/starred?per_page=100&sort=created&direction=desc', {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-REXI-Admin',
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const data = await response.json();
    const rows = data.map(r => ({
      full_name: r.full_name, owner: r.owner.login, name: r.name,
      description: r.description || '', language: r.language || '',
      stars: r.stargazers_count, forks: r.forks_count, url: r.html_url,
      starred_at: r.created_at,
    }));
    const filename = `github-starred-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      const headers = ['full_name', 'owner', 'name', 'description', 'language', 'stars', 'forks', 'url', 'starred_at'];
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send('\uFEFF' + csv);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    return res.send(JSON.stringify(rows, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Digest config status + manual trigger ─────────────────
router.get('/digest/status', (req, res) => {
  const tg = getTelegramConfig();
  const em = getEmailConfig();
  res.json({
    success: true,
    telegram: !!tg,
    email: !!em,
    telegram_chat: tg ? tg.chatId : '',
    email_to: em ? em.to : '',
  });
});

router.post('/digest/send', async (req, res) => {
  try {
    await sendDailyDigest();
    res.json({ success: true, message: 'Digest triggered' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/stars/snapshot', async (req, res) => {
  try {
    await snapshotSavedRepoStars();
    res.json({ success: true, message: 'Star snapshots updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Trending Notifications ─────────────────────────────────
router.get('/notifications', (req, res) => {
  try {
    const { limit = 20, unread_only = '0' } = req.query;
    const notifications = getNotifications(Number(limit), unread_only === '1');
    const unread_count = getUnreadCount();
    res.json({ success: true, notifications, unread_count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/notifications/unread-count', (req, res) => {
  try {
    const count = getUnreadCount();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/notifications/read', (req, res) => {
  try {
    const { ids } = req.body || {};
    markAsRead(ids || null);
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- GitHub Star/Unstar (requires GitHub PAT with repo scope) ---

// Check if a repo is starred by the authenticated user
router.get('/starred/:owner/:name', async (req, res) => {
  try {
    const { owner, name } = req.params;
    const response = await fetch(`https://api.github.com/user/starred/${owner}/${name}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-REXI-Admin',
      },
    });
    // 204 = starred, 404 = not starred
    res.json({ success: true, starred: response.status === 204 });
  } catch (error) {
    res.json({ success: true, starred: false });
  }
});

// Star a repo
router.post('/star', async (req, res) => {
  try {
    if (!GITHUB_TOKEN) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cần GitHub Personal Access Token. Thêm GITHUB_TOKEN vào file .env hoặc bảng khoa_api.' 
      });
    }
    const { owner, name } = req.body || {};
    if (!owner || !name) {
      return res.status(400).json({ success: false, error: 'Missing owner or name' });
    }
    const response = await fetch(`https://api.github.com/user/starred/${owner}/${name}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-REXI-Admin',
        'Content-Length': '0',
      },
    });
    if (response.status === 204) {
      res.json({ success: true, starred: true, message: `Starred ${owner}/${name}` });
    } else if (response.status === 404) {
      res.status(404).json({ success: false, error: 'Repo not found' });
    } else {
      const err = await response.text();
      res.status(response.status).json({ success: false, error: err });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unstar a repo
router.delete('/star/:owner/:name', async (req, res) => {
  try {
    if (!GITHUB_TOKEN) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cần GitHub Personal Access Token. Thêm GITHUB_TOKEN vào file .env hoặc bảng khoa_api.' 
      });
    }
    const { owner, name } = req.params;
    const response = await fetch(`https://api.github.com/user/starred/${owner}/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-REXI-Admin',
      },
    });
    if (response.status === 204) {
      res.json({ success: true, starred: false, message: `Unstarred ${owner}/${name}` });
    } else {
      res.json({ success: true, starred: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all starred repos for the authenticated user
router.get('/starred', async (req, res) => {
  try {
    if (!GITHUB_TOKEN) {
      return res.json({ success: true, repos: [], error: 'No GitHub token configured' });
    }
    const response = await fetch('https://api.github.com/user/starred?per_page=100&sort=created&direction=desc', {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-REXI-Admin',
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const data = await response.json();
    const repos = data.map(r => ({
      full_name: r.full_name,
      owner: r.owner.login,
      name: r.name,
      description: r.description || '',
      language: r.language || '',
      stars: r.stargazers_count,
      forks: r.forks_count,
      url: r.html_url,
      topics: r.topics || [],
      starred_at: r.created_at,
    }));
    res.json({ success: true, repos, count: repos.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

