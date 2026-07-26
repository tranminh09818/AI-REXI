const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Chống crash khi có lỗi bất ngờ (uncaughtException / unhandledRejection)
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason?.message || reason);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import Modular Routes
const workspaceRoutes = require('./src/routes/workspace.routes');
const authRoutes = require('./src/routes/auth.routes');
const chatRoutes = require('./src/routes/chat.routes');
const servicesRoutes = require('./src/routes/services.routes');

// Mount Routes
app.use('/api/workspace', workspaceRoutes);
app.use('/api', authRoutes);
app.use('/api', chatRoutes);
app.use('/api', servicesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AI REXI Backend Engine', version: '2.0.0' });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Rexi Backend Server running on http://localhost:${PORT}`);
});
