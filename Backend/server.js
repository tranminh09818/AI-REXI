const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');

// Import các routes của bạn
const authRoutes = require('./src/routes/auth.routes');
const chatRoutes = require('./src/routes/chat.routes');
const servicesRoutes = require('./src/routes/services.routes');
const workspaceRoutes = require('./src/routes/workspace.routes');
const { rateLimitMiddleware } = require('./src/middleware/rateLimit.middleware');

// Khởi tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình CORS - chỉ chấp nhận frontend đang dùng
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // Cho phép requests không có origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS không cho phép origin này: ' + origin));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session secret - TẠO RANDOM nếu không có env var (tốt hơn hardcode)
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
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

// Apply Teencode Normalization
app.use(promptNormalizerMiddleware);

// Liên kết các API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/admin', adminRoutes);

// (Tùy chọn) Phục vụ ứng dụng React đã build cho môi trường production
const frontendBuildPath = path.join(__dirname, '..', 'Frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
    });
}

// Khởi động server + auto-scanner IPTV
const { startScheduler } = require('./src/scheduler');
app.listen(PORT, () => {
  console.log(`[Server] AI REXI Backend đang chạy tại http://localhost:${PORT}`);
  if (process.env.ENABLE_IPTV_SCHEDULER !== 'false') {
    startScheduler();
  }
});