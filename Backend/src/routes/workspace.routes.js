const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/files', (req, res) => {
  const rootDir = path.join(__dirname, '..', '..', '..');
  
  function scanDir(dirPath, relativeDir = '') {
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
          children: scanDir(fullPath, itemRelPath)
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
    res.status(500).json({ error: err.message });
  }
});

router.get('/file-content', (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: 'Missing file path' });

  const rootDir = path.join(__dirname, '..', '..', '..');
  const fullPath = path.join(rootDir, relPath);

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ path: relPath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/file-content', (req, res) => {
  const { path: relPath, content } = req.body;
  if (!relPath) return res.status(400).json({ error: 'Missing file path' });

  const rootDir = path.join(__dirname, '..', '..', '..');
  const fullPath = path.join(rootDir, relPath);

  try {
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true, path: relPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
