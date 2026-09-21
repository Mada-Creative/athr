const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const prayerRoutes = require('./routes/prayer.routes');
const athkarRoutes = require('./routes/athkar.routes');
const quranRoutes = require('./routes/quran.routes');
const taskRoutes = require('./routes/task.routes');
const statsRoutes = require('./routes/stats.routes');
const tasbihRoutes = require('./routes/tasbih.routes');
const mosqueRoutes = require('./routes/mosque.routes');
const adminMosqueRoutes = require('./routes/adminMosque.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true, service: 'athr-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/prayers', prayerRoutes);
app.use('/api/athkar', athkarRoutes);
app.use('/api/quran', quranRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/tasbih', tasbihRoutes);
app.use('/api/mosques', mosqueRoutes);
app.use('/api/admin/mosques', adminMosqueRoutes);

// The mosque-review page — a plain static single-page tool, not part of
// the mobile app's own API surface. It ships its own login prompt for the
// ADMIN_TOKEN (see requireAdmin.js) rather than needing a real account.
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

app.use((req, res) => {
  res.status(404).json({ message: 'المسار غير موجود' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'حدث خطأ غير متوقع في الخادم' });
});

module.exports = app;
