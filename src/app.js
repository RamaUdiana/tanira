const express = require('express');
const session = require('express-session'); // Import session
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const smartPlantingRoutes = require('./routes/smartPlantingRoutes');
const marketRoutes = require('./routes/marketRoutes');
const producerRoutes = require('./routes/producerRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware Parsing & Static
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- KONFIGURASI SESSION ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'rahasia_dapur_tanira_123', // Ganti dengan string acak yang kuat
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set 'true' jika sudah pakai HTTPS (production)
        maxAge: 1000 * 60 * 60 * 24 // Session expired dalam 24 jam
    }
}));

// Global Middleware untuk passing user ke semua views (Opsional tapi berguna)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/smart-planting', smartPlantingRoutes);
app.use('/market', marketRoutes);
app.use('/producer', producerRoutes);

app.get('/', (req, res) => {
    res.render('landing', { title: 'Beranda' });
});

app.use((req, res, next) => {
  res.status(404).render('404');
});

module.exports = app
