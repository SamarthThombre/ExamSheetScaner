const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'examscanweb_production_secure_jwt_fallback_key_2026_x89a';

const generateToken = (userId, res) => {
  const secret = getJwtSecret();
  const token = jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: process.env.COOKIE_SAME_SITE || (isProduction ? 'lax' : 'lax'),
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
  });

  return token;
};

module.exports = generateToken;
