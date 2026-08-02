const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET phải được cấu hình trong production!') })() : 'dev-only-secret-' + crypto.randomBytes(16).toString('hex'));

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
        const decoded = jwt.verify(token, JWT_SECRET);
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
    if (req.user && (req.user.role === 'admin' || req.user.phan_quyen === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này.' });
    }
}

// Middleware kiểm tra giới hạn cho khách (chưa đăng nhập)
function guestMiddleware(req, res, next) {
    if (!req.session) req.session = {};
    if (req.session.messageCount === undefined) {
        req.session.messageCount = 0;
    }
    if (req.session.agentTaskCount === undefined) {
        req.session.agentTaskCount = 0;
    }

    // Giới hạn 10 tin nhắn chat cho người chưa đăng nhập
    if (req.session.messageCount >= 10) {
      return res.status(401).json({
        error: 'Bạn đã dùng hết 10 tin nhắn cho tài khoản khách. Hãy đăng nhập để chat không giới hạn.',
        code: 'LOGIN_REQUIRED',
        remaining: { messages: 0, agentTasks: Math.max(0, 3 - req.session.agentTaskCount) }
      });
    }
    // LƯU Ý: Không increment messageCount ở đây! Chỉ increment khi POST tin nhắn chat thành công.
    next();
}

// Middleware cho guest dùng Agent Mode (giới hạn 3 tasks)
function guestAgentMiddleware(req, res, next) {
    if (!req.session) req.session = {};
    if (req.session.agentTaskCount === undefined) {
        req.session.agentTaskCount = 0;
    }

    if (req.session.agentTaskCount >= 3) {
        return res.status(401).json({
            error: 'Bạn đã dùng hết 3 Agent Mode cho tài khoản khách. Đăng nhập để dùng Agent Mode không giới hạn.',
            code: 'AGENT_LIMIT_REACHED',
            remaining: { messages: Math.max(0, 10 - (req.session.messageCount || 0)), agentTasks: 0 }
        });
    }
    next();
}

// API check guest limits
function getGuestLimits(req) {
    const session = req.session || {};
    return {
        messages: {
            used: session.messageCount || 0,
            limit: 10,
            remaining: Math.max(0, 10 - (session.messageCount || 0))
        },
        agentTasks: {
            used: session.agentTaskCount || 0,
            limit: 3,
            remaining: Math.max(0, 3 - (session.agentTaskCount || 0))
        }
    };
}

module.exports = { authMiddleware, adminMiddleware, guestMiddleware, guestAgentMiddleware, getGuestLimits, JWT_SECRET };