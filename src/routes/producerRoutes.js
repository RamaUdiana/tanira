const express = require('express');
const router = express.Router();
const producerController = require('../controllers/producerController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

router.use(isAuthenticated);

// Dashboard
router.get('/', producerController.getDashboard);

// Manajemen Alat
router.get('/my-tools', producerController.getMyToolsPage);
router.get('/add-tool', producerController.getAddToolPage);
router.post('/add-tool', producerController.uploadToolImage, producerController.createTool);
router.post('/tool/toggle/:id', producerController.toggleToolStatus);

// Detail & Edit Alat (BARU)
router.get('/tool/:id', producerController.getToolDetail);
router.get('/edit-tool/:id', producerController.getEditToolPage);
router.post('/edit-tool/:id', producerController.uploadToolImage, producerController.updateTool);

// Manajemen Permintaan Sewa (BARU)
router.get('/requests', producerController.getRequests);
router.post('/request/:id/action', producerController.handleRequestAction);

module.exports = router;