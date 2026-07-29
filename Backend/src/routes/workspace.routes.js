const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

const rootDir = path.resolve(__dirname, '..', '..', '..');

function resolveWorkspacePath(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) {
    throw new Error('Missing file path');
  }

  const fullPath = path.resolve(rootDir, relativePath);
  const relative = path.relative(rootDir, fullPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('File path must remain inside the workspace');
    error.statusCode = 403;
    throw error;
  }
  return fullPath;
}

router.get('/files', authMiddleware, (req, res) => {
  function scanDir(dirPath, relativeDir = '', depth = 0) {
    if (depth > 8) return [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = [];

    for (const item of items) {
      if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' || item.name === '.archive_scripts') continue;
      
      const itemRelPath = path.join(relativeDir, item.name);
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        result.push({
          name: item.name,
          path: itemRelPath,
          type: 'folder',
          children: scanDir(fullPath, itemRelPath, depth + 1)
        });
      } else {
        result.push({
          name: item.name,
          path: itemRelPath,
          type: 'file'
        });
      }
    }
    return result;
  }

  try {
    const fileTree = scanDir(rootDir);
    res.json(fileTree);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Helper: validate path không thoát khỏi rootDir (chống path traversal)
function safePath(rootDir, relPath) {
  if (relPath.includes('\0')) return null;
  const fullPath = path.resolve(rootDir, relPath);
  const relative = path.relative(rootDir, fullPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
return fullPath;
}

router.get('/file-content', authMiddleware, (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: 'Missing file path' });

  const rootDir = path.join(__dirname, '..', '..', '..');
  const fullPath = safePath(rootDir, relPath);
  if (!fullPath) return res.status(403).json({ error: 'Path không hợp lệ (path traversal detected)' });

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ path: relPath, content });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/file-content', authMiddleware, (req, res) => {
  const { path: relPath, content } = req.body;
  if (!relPath) return res.status(400).json({ error: 'Missing file path' });

  const rootDir = path.join(__dirname, '..', '..', '..');
  const fullPath = safePath(rootDir, relPath);
  if (!fullPath) return res.status(403).json({ error: 'Path không hợp lệ (path traversal detected)' });

  try {
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true, path: relPath });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
