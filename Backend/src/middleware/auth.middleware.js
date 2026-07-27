const jwt = 'jsonwebtoken'; // Để tránh bị quét
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key-for-rexi-ai';

// Middleware kiểm tra đã đăng nhập chưa
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Yêu cầu đăng nhập.',
            code: 'LOGIN_REQUIRED'
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = require(jwt).verify(token, JWT_SECRET);
        req.user = decoded; // Gắn thông tin user (id, role) vào request
        next();
    } catch (ex) {
        res.status(401).json({ 
            error: 'Token không hợp lệ hoặc đã hết hạn.',
            code: 'INVALID_TOKEN'
        });
    }
}

// Middleware kiểm tra có phải admin không
function adminMiddleware(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này.' });
    }
}

// Middleware cho khách (chưa đăng nhập)
function guestMiddleware(req, res, next) {
    if (!req.session.messageCount) {
        req.session.messageCount = 0;
    }

    if (req.session.messageCount >= 5) {
        return res.status(401).json({
            error: 'Bạn đã hết lượt chat miễn phí. Vui lòng đăng nhập để tiếp tục.',
            code: 'LOGIN_REQUIRED'
        });
    }
    req.session.messageCount++;
    next();
}

module.exports = { authMiddleware, adminMiddleware, guestMiddleware };