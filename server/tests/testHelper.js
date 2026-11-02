const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const College = require('../models/College');
const Batch = require('../models/Batch');
const Sheet = require('../models/Sheet');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function connectTestDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/examscanweb');
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, college: user.college },
    process.env.JWT_SECRET || 'examscanweb_super_secret_jwt_key_2026_dev_env_auth',
    { expiresIn: '7d' }
  );
}

function createApiClient(token = null) {
  const headers = {};
  if (token) {
    headers['Cookie'] = `jwt=${token}`;
  }
  return axios.create({
    baseURL: BASE_URL,
    headers,
    validateStatus: () => true // Allow handling non-2xx statuses without throwing immediately
  });
}

module.exports = {
  connectTestDB,
  generateToken,
  createApiClient,
  BASE_URL
};
