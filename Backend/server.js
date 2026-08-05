const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const browserStream = require('./src/services/browserStream');

// Import các routes của bạn
const authRoutes = require('./src/routes/auth.routes');
const chatRoutes = require('./src/routes/chat.routes');
const servicesRoutes = require('./src/routes/services.routes');
const modelsRoutes = require('./src/routes/models.routes');
const workspaceRoutes = require('./src/routes/workspace.routes');
const agentRoutes = require('./src/routes/agent.routes');
const { rateLimitMiddleware } = require('./src/middleware/rateLimit.middleware');

const { ensureAdmin, ensureGuestUser } = require('./src/ensure-admin');
ensureAdmin().catch(console.error);
ensureGuestUser().catch(console.error);

// ═══════════════════════════════════════════════════════════
// Global error handlers — prevent uncaught exceptions from
// crashing the entire server process.
// ═══════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

// Khởi tạo ứng dụng Express
const app = express();
// Ưu tiên PORT từ file .env để tránh bị biến môi trường hệ thống (vd: PORT=20128)
// ghi đè khiến server chạy sai cổng / xung đột với OmniRoute.
const envPortMatch = fs.existsSync(path.join(__dirname, '..', '.env'))
  ? fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').match(/^PORT\s*=\s*(\d+)/m)
  : null;
const PORT = parseInt(envPortMatch && envPortMatch[1], 10) || parseInt(process.env.PORT, 10) || 5000;

// Cấu hình CORS - chỉ chấp nhận frontend đang dùng
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000', 'http://127.0.0.1:5000', 'http://[::1]:5173', 'http://[::1]:5000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Cho phép tất cả origin local
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('::1')) {
      return callback(null, true);
    }
    const envAllowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];
    if (envAllowed.includes(origin)) return callback(null, true);
    // FIX CORS: chặn origin không thuộc danh sách cho phép (trước đây cho phép mọi origin + credentials)
    return callback(new Error('Origin không được phép bởi CORS'));
  },
  credentials: true
}));
app.use(helmet({ contentSecurityPolicy: false })); // Security headers (CSP tắt để không chặn hls.js/fonts CDN)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session secret - TẠO RANDOM nếu không có env var (tốt hơn hardcode)
// FIX: ưu tiên SESSION_SECRET, fallback JWT_SECRET (ổn định giữa các lần restart thay vì random mỗi lần)
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 giờ
  }
}));

// Áp dụng Rate Limiting cho TẤT CẢ API routes (trừ static files)
app.use('/api', rateLimitMiddleware);

const { promptNormalizerMiddleware } = require('./src/middleware/promptNormalizer.middleware');
const adminRoutes = require('./src/routes/admin.routes');
const githubRoutes = require('./src/routes/github.routes');

// Apply Teencode Normalization
app.use(promptNormalizerMiddleware);

// Liên kết các API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/github', githubRoutes);

// (Tùy chọn) Phục vụ ứng dụng React đã build cho môi trường production
const frontendBuildPath = path.join(__dirname, '..', 'Frontend', 'dist');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('/{*path}', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
    });
}

// Khởi động server + auto-scanner IPTV
const { startScheduler } = require('./src/scheduler');
const { startGitHubScheduler } = require('./src/github-trending-scheduler');
const server = app.listen(PORT, () => {
  console.log(`[Server] AI REXI Backend đang chạy tại http://localhost:${PORT}`);
  if (process.env.ENABLE_IPTV_SCHEDULER !== 'false') {
    startScheduler();
  }
  startGitHubScheduler();
});

// WebSocket server cho Browser Stream
const wss = new WebSocketServer({ server, path: '/api/services/browser/stream' });
browserStream.setWSS(wss);