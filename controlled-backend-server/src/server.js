const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDatabase } = require('./db');

// Route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const fileRoutes = require('./routes/files');
const activityRoutes = require('./routes/activity');
const demoRoutes = require('./routes/demo');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets for the demo control panel
app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'allow' }));

// Root redirect to demo UI
app.get('/', (req, res) => {
  res.redirect('/demo');
});

app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'demo.html'), { dotfiles: 'allow' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Controlled Test Backend Server',
    timestamp: new Date().toISOString(),
    port: config.PORT,
    monitoring_target: config.MONITORING_PLATFORM_URL
  });
});

// Mount Section 5 REST APIs directly on root
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', fileRoutes);
app.use('/', activityRoutes);

// Mount demo scenario trigger APIs
app.use('/demo', demoRoutes);

// Start server after database initialization
initDatabase()
  .then(() => {
    app.listen(config.PORT, () => {
      console.log('====================================================');
      console.log('🚀 CONTROLLED BACKEND TEST SERVER IS RUNNING');
      console.log(`📡 URL: http://localhost:${config.PORT}`);
      console.log(`🎛️  Demo Control Panel: http://localhost:${config.PORT}/demo`);
      console.log(`🔗 Ingestion Target: ${config.MONITORING_PLATFORM_URL}`);
      console.log('====================================================');
    });
  })
  .catch((err) => {
    console.error('Failed to initialize controlled backend SQLite database:', err);
    process.exit(1);
  });

module.exports = app;
