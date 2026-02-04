const express = require('express');
const router = express.Router();
const controller = require('../controllers/smartPlantingController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

router.use(isAuthenticated);

// Halaman Utama Smart Planting
router.get('/', controller.index);

// Halaman Simulasi Tanam
router.get('/simulation', controller.simulation);

// Proses Simpan Rencana
router.post('/save', controller.savePlan);

// Halaman Sukses
router.get('/success/:id', controller.successPage);

module.exports = router;