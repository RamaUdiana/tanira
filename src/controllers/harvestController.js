const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import fs module

// --- KONFIGURASI MULTER (UPLOAD FILE) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'src/public/uploads/harvests';
        // Check if directory exists, if not create it
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'harvest-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Hanya diperbolehkan upload gambar (jpg, jpeg, png, webp)!'));
    }
});

// Export middleware upload agar bisa dipakai di route
exports.uploadMiddleware = upload.single('image'); 

// Helper Format Rupiah
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

// Helper Format Tanggal
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// GET /market/add-harvest/:planId
exports.getAddPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const planId = req.params.planId ? parseInt(req.params.planId) : null;
        
        let plan = null;
        let crops = [];

        // Jika ada planId, ambil detail rencana tanam
        if (planId) {
            plan = await prisma.plantingPlan.findUnique({
                where: { id: planId },
                include: { crop: true }
            });

            // Validasi kepemilikan
            if (!plan || plan.userId !== userId) {
                return res.status(403).send('Akses ditolak atau rencana tidak ditemukan.');
            }
        } else {
            // Jika Manual, ambil daftar semua tanaman (Crops) untuk dropdown
            crops = await prisma.crop.findMany({
                orderBy: { name: 'asc' }
            });
        }

        res.render('market/add-harvest', {
            title: 'Jual Hasil Tanam - TANIRA',
            plan: plan, // Akan null jika mode manual
            crops: crops, // Akan berisi list tanaman jika mode manual
            user: req.session.user
        });

    } catch (error) {
        console.error("Get Add Harvest Error:", error);
        res.status(500).send("Terjadi kesalahan pada server.");
    }
};

// POST /market/add-harvest
exports.createListing = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        let { 
            planId, 
            cropId, 
            customCropName, // Input baru jika tanaman tidak ada di list
            quantity, 
            price, 
            harvestDate, 
            minOrder, 
            description 
        } = req.body;

        // 1. Handle Crop ID
        // Jika mode manual dan user memilih "Lainnya" atau mengetik baru
        if (!cropId && customCropName) {
            // Cek apakah tanaman sudah ada di DB
            let crop = await prisma.crop.findFirst({ where: { name: customCropName } });
            
            if (!crop) {
                // Buat tanaman baru di master data jika belum ada
                crop = await prisma.crop.create({
                    data: {
                        name: customCropName,
                        category: 'Umum', // Default category
                        growthDuration: 90, // Default duration
                        avgYieldPerHa: 0
                    }
                });
            }
            cropId = crop.id;
        }

        // Cek jika ada file yang diupload
        const imageUrl = req.file ? `/uploads/harvests/${req.file.filename}` : null;

        // 2. Buat Listing Baru
        await prisma.harvestListing.create({
            data: {
                userId: userId,
                cropId: parseInt(cropId),
                quantity: parseFloat(quantity),
                price: parseFloat(price),
                harvestDate: new Date(harvestDate),
                minOrder: parseFloat(minOrder) || 1,
                description: description,
                imageUrl: imageUrl, 
                status: 'active',
                approved: false
            }
        });

        // 3. (Opsional) Jika dari Plan, tandai plan sebagai 'converted' atau arsipkan?
        // Untuk sekarang biarkan saja.

        res.json({ 
            success: true, 
            redirectUrl: '/market/my-preorders' 
        });

    } catch (error) {
        console.error("Create Listing Error:", error);
        res.status(500).json({ message: "Gagal membuat listing penjualan." });
    }
};

// --- FUNGSI PRE-ORDER SAYA ---
exports.getMyPreOrders = async (req, res) => {
    try {
        const userId = req.session.userId;

        // 1. Ambil Listing User + Orders
        const listings = await prisma.harvestListing.findMany({
            where: { userId: userId },
            include: {
                crop: true,
                orders: true 
            },
            orderBy: { id: 'desc' } // Sort by ID desc karena createdAt mungkin tidak ada
        });

        // 2. Hitung Statistik untuk Header
        const activeListings = listings.filter(l => l.status === 'active');
        const totalActive = activeListings.length;
        
        // Total Estimasi Panen (Ton)
        const totalHarvestKg = activeListings.reduce((sum, item) => sum + item.quantity, 0);
        const totalHarvestTon = (totalHarvestKg / 1000).toFixed(1);

        // Cari Komoditas Peminat Tertinggi
        let topCommodity = "-";
        if (listings.length > 0) {
            const sortedByOrders = [...listings].sort((a, b) => b.orders.length - a.orders.length);
            if(sortedByOrders[0].orders.length > 0) {
                topCommodity = sortedByOrders[0].crop.name;
            } else if (listings.length > 0) {
                topCommodity = listings[0].crop.name; 
            }
        }

        // 3. Siapkan Data Per Listing (Progress Bar)
        const listingsWithStats = listings.map(listing => {
            const booked = listing.orders.reduce((sum, order) => sum + order.quantity, 0);
            const progress = listing.quantity > 0 ? Math.min(Math.round((booked / listing.quantity) * 100), 100) : 0;
            
            let statusBadge = { text: 'Aktif', class: 'bg-green-100 text-tanira-green' };
            if (listing.status === 'draft') {
                statusBadge = { text: 'Draft', class: 'bg-gray-100 text-gray-500' };
            } else if (progress >= 100) {
                statusBadge = { text: 'Sold Out', class: 'bg-red-100 text-red-600' };
            } else if (progress >= 90) {
                statusBadge = { text: 'Hampir Penuh', class: 'bg-amber-100 text-amber-600' };
            }

            return {
                ...listing,
                booked,
                progress,
                statusBadge
            };
        });

        res.render('market/my-preorders', {
            title: 'Pre-Order Saya - TANIRA',
            listings: listingsWithStats,
            stats: { totalActive, totalHarvestTon, topCommodity },
            user: req.session.user,
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error("My Preorders Error:", error);
        res.status(500).send("Terjadi kesalahan pada server saat memuat data pre-order.");
    }
};

exports.getListingDetail = async (req, res) => {
    try {
        const userId = req.session.userId;
        const listingId = parseInt(req.params.id);

        // 1. Ambil Data Listing + Orders + Buyer Info
        const listing = await prisma.harvestListing.findUnique({
            where: { id: listingId },
            include: {
                crop: true,
                user: { include: { farmerProfile: true } }, // Untuk lokasi lahan
                orders: {
                    include: { buyer: true }, // Ambil nama pembeli
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        // 2. Security Check (Pastikan yang akses adalah pemilik)
        if (!listing || listing.userId !== userId) {
            return res.status(403).send("Akses ditolak. Listing tidak ditemukan atau bukan milik Anda.");
        }

        // 3. Hitung Statistik
        const booked = listing.orders.reduce((sum, o) => sum + o.quantity, 0);
        const progress = listing.quantity > 0 ? Math.min(Math.round((booked / listing.quantity) * 100), 100) : 0;
        const remaining = Math.max(listing.quantity - booked, 0);
        const revenuePotential = listing.quantity * listing.price;
        const revenueRealized = booked * listing.price;

        // 4. Status Badge Logic
        let statusMeta = { text: 'Aktif', color: 'green', icon: 'fa-check' };
        if (listing.status === 'draft') statusMeta = { text: 'Draft', color: 'gray', icon: 'fa-file' };
        else if (progress >= 100) statusMeta = { text: 'Sold Out', color: 'red', icon: 'fa-lock' };
        else if (progress >= 80) statusMeta = { text: 'Hampir Penuh', color: 'amber', icon: 'fa-fire' };

        // 5. Gambar (Fallback jika null)
        const imageUrl = listing.imageUrl || "https://images.unsplash.com/photo-1590802778336-d760777e436f?q=80&w=200&auto=format&fit=crop";

        res.render('market/preorder-detail', {
            title: `Kelola ${listing.crop.name} - TANIRA`,
            listing,
            stats: { booked, progress, remaining, revenuePotential, revenueRealized, statusMeta },
            imageUrl,
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error("Get Listing Detail Error:", error);
        res.status(500).send("Terjadi kesalahan sistem.");
    }
};

// GET /market/edit/:id
exports.getEditPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const listingId = parseInt(req.params.id);

        // 1. Ambil Data Listing
        const listing = await prisma.harvestListing.findUnique({
            where: { id: listingId },
            include: {
                crop: true,
                user: { include: { farmerProfile: true } }
            }
        });

        // 2. Validasi Kepemilikan
        if (!listing || listing.userId !== userId) {
            return res.status(403).send("Akses ditolak. Listing tidak ditemukan atau bukan milik Anda.");
        }

        // 3. Fallback Image
        const imageUrl = listing.imageUrl || "https://images.unsplash.com/photo-1590802778336-d760777e436f?q=80&w=200&auto=format&fit=crop";

        // 4. Render View
        res.render('market/edit-preorder', {
            title: `Edit ${listing.crop.name} - TANIRA`,
            listing,
            imageUrl,
            // Helper khusus untuk format value input date (YYYY-MM-DD)
            dateValue: listing.harvestDate.toISOString().split('T')[0],
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error("Get Edit Page Error:", error);
        res.status(500).send("Terjadi kesalahan sistem.");
    }
};

// POST /market/edit/:id
exports.updateListing = async (req, res) => {
    try {
        const userId = req.session.userId;
        const listingId = parseInt(req.params.id);
        const { price, harvestDate, minOrder, description, status } = req.body;

        // 1. Cek Validasi Kepemilikan (Lagi, untuk keamanan API)
        const check = await prisma.harvestListing.findUnique({ where: { id: listingId } });
        if (!check || check.userId !== userId) {
            return res.status(403).json({ message: "Akses ditolak." });
        }

        // 2. Update Database
        await prisma.harvestListing.update({
            where: { id: listingId },
            data: {
                price: parseFloat(price),
                harvestDate: new Date(harvestDate),
                minOrder: parseFloat(minOrder),
                description: description,
                status: status
            }
        });

        // 3. Response Sukses
        res.json({ 
            success: true, 
            redirectUrl: `/market/manage/${listingId}` 
        });

    } catch (error) {
        console.error("Update Listing Error:", error);
        res.status(500).json({ message: "Gagal menyimpan perubahan." });
    }
};

const HARVEST_STAGES = [
    { id: 0, title: "Persiapan Lahan", icon: "fa-trowel" },
    { id: 1, title: "Penanaman", icon: "fa-seedling" },
    { id: 2, title: "Perawatan & Pemupukan", icon: "fa-hand-holding-droplet" },
    { id: 3, title: "Menjelang Panen", icon: "fa-carrot" },
    { id: 4, title: "Panen Raya", icon: "fa-basket-shopping" }
];

// GET /market/status/:id
exports.getStatusPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const listingId = parseInt(req.params.id);

        const listing = await prisma.harvestListing.findUnique({
            where: { id: listingId },
            include: { crop: true }
        });

        if (!listing || listing.userId !== userId) {
            return res.status(403).send("Akses ditolak.");
        }

        // Hitung Persentase Progress (0 - 100%)
        const totalStages = HARVEST_STAGES.length - 1;
        const progressPercent = (listing.progressStage / totalStages) * 100;

        res.render('market/harvest-status', {
            title: `Status ${listing.crop.name} - TANIRA`,
            listing,
            stages: HARVEST_STAGES,
            progressPercent,
            helpers: { formatDate }
        });

    } catch (error) {
        console.error("Get Status Page Error:", error);
        res.status(500).send("Terjadi kesalahan sistem.");
    }
};

// POST /market/status/:id
exports.updateStatus = async (req, res) => {
    try {
        const userId = req.session.userId;
        const listingId = parseInt(req.params.id);
        const { stage, note } = req.body;

        // Validasi
        const listing = await prisma.harvestListing.findUnique({ where: { id: listingId } });
        if (!listing || listing.userId !== userId) {
            return res.status(403).json({ message: "Akses ditolak." });
        }

        // Update DB
        await prisma.harvestListing.update({
            where: { id: listingId },
            data: {
                progressStage: parseInt(stage),
                lastLogMessage: note,
                lastLogDate: new Date()
            }
        });

        res.json({ success: true, message: "Status berhasil diperbarui." });

    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ message: "Gagal update status." });
    }
};