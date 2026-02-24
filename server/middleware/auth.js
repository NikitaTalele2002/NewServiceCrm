import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_change_me';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user; // { id, username, centerName }
    next();
  });
}

// Optional authenticate: if token present, verify and set req.user, otherwise continue
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) req.user = user;
    // ignore errors and continue without user
    return next();
  });
}

// Require a specific role (normalized). Usage: requireRole('service_center') or requireRole(['admin', 'service_center'])
function requireRole(requiredRole) {
  return function (req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err || !user) return res.status(403).json({ message: 'Invalid token' });
      // Normalize role strings for comparison
      const userRole = (user.role || '').toString().toLowerCase().replace(/\s+/g, '_');
      const wants = Array.isArray(requiredRole) ? requiredRole.map(r => (r || '').toString().toLowerCase().replace(/\s+/g, '_')) : [(requiredRole || '').toString().toLowerCase().replace(/\s+/g, '_')];
      if (!wants.includes(userRole)) return res.status(403).json({ message: 'Forbidden: insufficient role' });
      // attach user and continue
      req.user = user;
      next();
    });
  };
}

export { authenticateToken, optionalAuthenticate, requireRole };
