const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');
const harvestController = require('../controllers/harvestController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

router.use(isAuthenticated);

// --- MARKET PUBLIC (Pembeli) ---
router.get('/', marketController.getMarketplace); // Dashboard Marketplace
router.get('/harvest/:id', marketController.getHarvestDetail); // Detail Listing

// Flow Pre-Order
router.get('/preorder-form/:id', marketController.getPreOrderForm); // Form Input Qty
router.post('/preorder', marketController.submitPreOrder); // Submit
router.get('/preorder-success/:id', marketController.getOrderSuccess); // Halaman Sukses

// Status Pesanan (Dashboard Pembeli)
router.get('/orders', marketController.getBuyerOrders);
router.get('/orders/:id', marketController.getBuyerOrderDetail);

// --- MARKET TOOLS (Petani Cari Alat) ---
router.get('/tools', marketController.getToolsMarketplace);

// --- MARKET PETANI (Manajemen) ---
router.get('/add-harvest', harvestController.getAddPage); 

// 2. Halaman Tambah dari Plan (Dengan ID)
router.get('/add-harvest/:planId', harvestController.getAddPage);

// Proses Simpan
router.post('/add-harvest', harvestController.uploadMiddleware, harvestController.createListing);
router.get('/my-preorders', harvestController.getMyPreOrders);
router.get('/manage/:id', harvestController.getListingDetail);
router.get('/edit/:id', harvestController.getEditPage);
router.post('/edit/:id', harvestController.updateListing);
router.get('/status/:id', harvestController.getStatusPage);
router.post('/status/:id', harvestController.updateStatus);

// --- MARKET TOOLS (Penyewaan) ---
router.get('/tools', marketController.getToolsMarketplace); // List Alat
router.get('/tools/history', marketController.getToolHistory); // Riwayat (Pindahkan ke atas dynamic ID agar tidak konflik)
router.get('/tools/:id', marketController.getToolDetail); // Detail
router.get('/tools/order/:id', marketController.getToolOrderForm); // Form
router.post('/tools/order', marketController.submitToolOrder); // Submit
router.get('/tools/success/:id', marketController.getToolSuccess); // Sukses

module.exports = router;