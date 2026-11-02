const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies.jwt;

  if (!token) {
    res.status(401);
    throw new Error('Not authorised, no token');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    res.status(401);
    throw new Error('Not authorised, user not found');
  }

  req.user = user;
  next();
});

module.exports = { verifyToken };
