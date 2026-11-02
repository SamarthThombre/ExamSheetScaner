const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const seedInitialData = require('./config/seed');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const batchRoutes = require('./routes/batchRoutes');
const sheetRoutes = require('./routes/sheetRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const resultRoutes = require('./routes/resultRoutes');
const adminRoutes = require('./routes/adminRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const issueRoutes = require('./routes/issueRoutes');
const accessRequestRoutes = require('./routes/accessRequestRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

// 1. dotenv.config()
dotenv.config();

const app = express();

// 2. express.json(), express.urlencoded({ extended: true })
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. cookie-parser
app.use(cookieParser());

// 4. cors setup (supports comma-separated origins, localhost & deployed domains)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, origin);
    }
  },
  credentials: true
}));

// Serve uploaded paper scans statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. Routes: /api/health, /api/auth, /api/batches, /api/results, /api/admin
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/batches', uploadRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/batches', sheetRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/admin/roster', rosterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/access-requests', accessRequestRoutes);
app.use('/api/issues', issueRoutes);

// 6. Serve static React build in production / single-server mode
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    // If request is an unmatched API call, pass to API 404 handler
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

// 7. 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// 8. errorMiddleware
app.use(errorHandler);

// 9. connectDB() then app.listen(PORT)
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedInitialData();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
