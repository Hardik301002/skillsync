const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. Get token
    const token = req.header('x-auth-token') || req.header('Authorization');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // 2. Clean Token
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token;

        // 3. Verify
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

        // 4. Attach User
        // Because we fixed authController to sign { user: { id } }, this now works:
        req.user = decoded.user;
        
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};