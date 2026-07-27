const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key-for-rexi-ai';

const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_MINUTE = 100; // Relax limit to 100 requests per minute for normal users

function rateLimitMiddleware(req, res, next) {
  // Check if request carries an admin token to bypass rate limit
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.role === 'admin') {
        return next(); // Bỏ qua rate limit hoàn toàn cho Admin
      }
    } catch (e) {
      // Token lỗi hoặc hết hạn thì áp dụng rate limit bình thường
    }
  }

  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  const record = requestCounts.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
    return next();
  }

  record.count += 1;
  if (record.count > MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({
      error: 'Quá nhiều yêu cầu trong thời gian ngắn (Rate Limit Exceeded). Vui lòng đợi 1 phút.'
    });
  }

  next();
}

module.exports = {
  rateLimitMiddleware
};

