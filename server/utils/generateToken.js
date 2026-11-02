const jwt = require('jsonwebtoken');

const generateToken = (userId, res) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? (process.env.COOKIE_SAME_SITE || 'none') : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
  });

  return token;
};

module.exports = generateToken;
