const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const fs = require('fs');

// Import các routes của bạn
const authRoutes = require('./src/routes/auth.routes');
const chatRoutes = require('./src/routes/chat.routes');
const servicesRoutes = require('./src/routes/services.routes');
const workspaceRoutes = require('./src/routes/workspace.routes');

// Khởi tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Tăng giới hạn để xử lý file lớn (PDF, ảnh...)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cấu hình Session cho Guest Middleware (giới hạn 5 tin nhắn)
app.use(session({
  secret: process.env.SESSION_SECRET || 'a-very-secret-session-key-for-rexi-ai',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' } // 'secure: true' nếu dùng HTTPS
}));

const { promptNormalizerMiddleware } = require('./src/middleware/promptNormalizer.middleware');

// Apply Teencode Normalization
app.use(promptNormalizerMiddleware);

// Liên kết các API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/workspace', workspaceRoutes);

// (Tùy chọn) Phục vụ ứng dụng React đã build cho môi trường production
const frontendBuildPath = path.join(__dirname, '..', 'Frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
    });
}

// Khởi động server
app.listen(PORT, () => {
  console.log(`[Server] AI REXI Backend đang chạy tại http://localhost:${PORT}`);
});