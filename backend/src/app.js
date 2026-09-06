const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const prayerRoutes = require('./routes/prayer.routes');
const athkarRoutes = require('./routes/athkar.routes');
const quranRoutes = require('./routes/quran.routes');
const taskRoutes = require('./routes/task.routes');
const statsRoutes = require('./routes/stats.routes');

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

app.use((req, res) => {
  res.status(404).json({ message: 'المسار غير موجود' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'حدث خطأ غير متوقع في الخادم' });
});

module.exports = app;
