const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Middleware Auth
router.use(isAuthenticated);

// GET /dashboard
// PASTIKAN MEMANGGIL .getDashboard (sesuai nama di controller)
router.get('/', dashboardController.getDashboard);

module.exports = router;