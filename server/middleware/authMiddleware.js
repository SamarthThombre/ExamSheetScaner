const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const getJwtSecret = () => process.env.JWT_SECRET || 'examscanweb_production_secure_jwt_fallback_key_2026_x89a';

const verifyToken = asyncHandler(async (req, res, next) => {
  let token = req.cookies && req.cookies.jwt;

  // Also support Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorised, no token');
  }

  const decoded = jwt.verify(token, getJwtSecret());
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    res.status(401);
    throw new Error('Not authorised, user not found');
  }

  req.user = user;
  next();
});

module.exports = { verifyToken };
