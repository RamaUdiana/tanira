const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper Format Rupiah
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

// Helper Format Tanggal
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// GET /market/harvest/:id
// exports.getHarvestDetail = async (req, res) => {
//     try {
//         const listingId = parseInt(req.params.id);

//         // 1. Ambil Data Listing beserta Relasinya
//         const listing = await prisma.harvestListing.findUnique({
//             where: { id: listingId },
//             include: {
//                 crop: true, // Data Tanaman
//                 user: {     // Data Petani
//                     include: {
//                         farmerProfile: true, // Lokasi petani
//                         reviews: true        // Rating petani (jika ada)
//                     }
//                 }
//             }
//         });

//         if (!listing) {
//             return res.status(404).render('404');
//         }

//         // 2. Hitung Rating Rata-rata Petani (Mockup logic jika belum ada data review)
//         const rating = 4.8; 
//         const reviewCount = listing.user.reviews.length || 120;

//         // 3. Mock Data Tambahan (Karena belum ada di schema)
//         // Image mapping berdasarkan nama tanaman
//         let imageUrl = "https://images.unsplash.com/photo-1590802778336-d760777e436f?q=80&w=1000&auto=format&fit=crop"; // Default Cabai
//         if (listing.crop.name.toLowerCase().includes('jagung')) imageUrl = "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=1000";
//         if (listing.crop.name.toLowerCase().includes('padi')) imageUrl = "https://images.unsplash.com/photo-1536617621572-1d5f1e6269a0?q=80&w=1000";

//         // Harga Referensi (Mockup: Harga asli + 10% atau random logic)
//         const marketPrice = listing.price * 0.95; 

//         // Progress Tanam (Mockup logic berdasarkan tanggal panen)
//         // Asumsi: Jika panen < 1 bulan lagi, progress 75%
//         const daysToHarvest = Math.ceil((new Date(listing.harvestDate) - new Date()) / (1000 * 60 * 60 * 24));
//         let progressStatus = "Fase Pembuahan (75%)";
//         let progressWidth = 75;
        
//         if (daysToHarvest > 60) { progressStatus = "Fase Vegetatif (30%)"; progressWidth = 30; }
//         else if (daysToHarvest < 7) { progressStatus = "Siap Panen (95%)"; progressWidth = 95; }

//         res.render('market/harvest-detail', {
//             title: `Detail ${listing.crop.name} - TANIRA`,
//             listing: listing,
//             meta: {
//                 imageUrl,
//                 rating,
//                 reviewCount,
//                 marketPrice,
//                 progressStatus,
//                 progressWidth
//             },
//             helpers: { formatRupiah, formatDate }
//         });

//     } catch (error) {
//         console.error("Market Detail Error:", error);
//         res.status(500).render('500');
//     }
// };

// POST /market/preorder/:id (Untuk handle tombol Pre-Order)
exports.preOrderAction = async (req, res) => {
    // Logic untuk redirect ke form pembayaran/checkout
    // Sementara redirect ke halaman form statis atau dashboard
    const listingId = req.params.id;
    // Disini bisa ditambahkan logika validasi stok dll.
    
    // Redirect ke halaman checkout (belum dibuat, kita arahkan kembali dulu dengan query success)
    res.redirect(`/market/harvest/${listingId}?action=preorder_started`);
};

exports.getToolsMarketplace = async (req, res) => {
    try {
        const { search, category } = req.query;

        // Build Query
        const whereClause = {
            availability: true // Hanya tampilkan yang tersedia
        };

        if (category && category !== 'Semua') {
            whereClause.category = category;
        }

        if (search) {
            whereClause.toolName = {
                contains: search
                // mode: 'insensitive' // Prisma MySQL default case-insensitive, kalau Postgres butuh ini
            };
        }

        // Ambil Data Alat
        const tools = await prisma.toolListing.findMany({
            where: whereClause,
            include: {
                user: { include: { farmerProfile: true } } // Info Penyedia & Lokasi
            },
            orderBy: { id: 'desc' }
        });

        // Ambil Daftar Kategori Unik untuk Filter
        // (Bisa hardcode atau query distinct dari DB)
        const categories = ["Semua", "Alat Berat", "Alsintan Ringan", "Bibit & Pupuk", "Jasa Tanam"];

        res.render('market/tools-marketplace', {
            title: 'Marketplace Alat - TANIRA',
            tools,
            categories,
            activeCategory: category || 'Semua',
            searchQuery: search || '',
            helpers: { formatRupiah }
        });

    } catch (error) {
        console.error("Get Tools Market Error:", error);
        res.status(500).render('500');
    }
};

// --- MARKETPLACE UTAMA (Dashboard Pembeli) ---
// GET /market
exports.getMarketplace = async (req, res) => {
    try {
        const { search, category } = req.query;

        // 1. QUERY UTAMA (LISTING GRID)
        const whereClause = { status: 'active' };
        if (search) {
            whereClause.crop = { name: { contains: search } };
        }

        const listings = await prisma.harvestListing.findMany({
            where: whereClause,
            include: {
                crop: true,
                user: { include: { farmerProfile: true } }
            },
            orderBy: { id: 'desc' }
        });

        // 2. QUERY TRENDING (TOP 5 BY ORDERS COUNT)
        // Hanya ambil jika tidak sedang searching
        let trendingListings = [];
        if (!search) {
            trendingListings = await prisma.harvestListing.findMany({
                where: { status: 'active' },
                include: {
                    crop: true,
                    user: { include: { farmerProfile: true } },
                    orders: true // Butuh ini untuk sorting manual jika DB tidak support relation count sort
                },
                // Prisma sort by relation count:
                orderBy: {
                    orders: {
                        _count: 'desc'
                    }
                },
                take: 5
            });
        }

        // Helper Function untuk hitung stats
        const calculateStats = async (items) => {
            return Promise.all(items.map(async (listing) => {
                const orders = await prisma.order.findMany({ where: { listingId: listing.id } });
                const booked = orders.reduce((sum, o) => sum + o.quantity, 0);
                const progress = listing.quantity > 0 ? Math.min(Math.round((booked / listing.quantity) * 100), 100) : 0;
                return { ...listing, progress };
            }));
        };

        const listingsWithStats = await calculateStats(listings);
        const trendingWithStats = await calculateStats(trendingListings);

        res.render('buyer/marketplace', {
            title: 'Marketplace Panen - TANIRA',
            listings: listingsWithStats,
            trending: trendingWithStats, // Kirim data trending ke view
            searchQuery: search || '',
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error("Get Marketplace Error:", error);
        res.status(500).send("Gagal memuat marketplace.");
    }
};

// --- DETAIL & FORM PRE-ORDER ---

// GET /market/harvest/:id (Detail) - SUDAH ADA, update sedikit untuk view path
exports.getHarvestDetail = async (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const listing = await prisma.harvestListing.findUnique({
            where: { id: listingId },
            include: {
                crop: true,
                user: { include: { farmerProfile: true, reviews: true } }
            }
        });

        if (!listing) return res.status(404).send("Listing tidak ditemukan");

        // Statistik Progress
        const orders = await prisma.order.findMany({ where: { listingId } });
        const booked = orders.reduce((sum, o) => sum + o.quantity, 0);
        const progress = Math.min(Math.round((booked / listing.quantity) * 100), 100);
        const remaining = listing.quantity - booked;

        // Mockup Data Tambahan
        const imageUrl = listing.imageUrl || "https://images.unsplash.com/photo-1590802778336-d760777e436f?q=80&w=1000";
        const rating = 4.8; 
        const reviewCount = 12;
        const marketPrice = listing.price * 1.1; // Harga pasar > Harga petani
        
        let progressStatus = "Fase Tanam";
        if(listing.progressStage >= 3) progressStatus = "Siap Panen";
        else if(listing.progressStage >= 1) progressStatus = "Perawatan";

        res.render('buyer/harvest-detail', { // Pastikan view ada di folder buyer
            title: `Detail ${listing.crop.name}`,
            listing,
            stats: { booked, progress, remaining },
            meta: { imageUrl, rating, reviewCount, marketPrice, progressStatus },
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
};

// GET /market/preorder-form/:id
exports.getPreOrderForm = async (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const listing = await prisma.harvestListing.findUnique({
            where: { id: listingId },
            include: { crop: true, user: { include: { farmerProfile: true } } }
        });

        if (!listing) return res.status(404).send("Listing tidak valid.");

        res.render('buyer/preorder-form', {
            title: 'Konfirmasi Pre-Order',
            listing,
            user: req.session.user, // Data pembeli
            helpers: { formatRupiah }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
};

// POST /market/preorder (Submit Order)
exports.submitPreOrder = async (req, res) => {
    try {
        const buyerId = req.session.userId;
        const { listingId, quantity } = req.body;
        
        const listing = await prisma.harvestListing.findUnique({ where: { id: parseInt(listingId) } });
        const totalPrice = listing.price * parseFloat(quantity);

        // Buat Order
        const newOrder = await prisma.order.create({
            data: {
                listingId: parseInt(listingId),
                buyerId: buyerId,
                quantity: parseFloat(quantity),
                totalPrice: totalPrice,
                status: 'pending'
            }
        });

        res.json({ success: true, redirectUrl: `/market/preorder-success/${newOrder.id}` });

    } catch (error) {
        console.error("Submit Order Error:", error);
        res.status(500).json({ message: "Gagal memproses pesanan." });
    }
};

// GET /market/preorder-success/:id
exports.getOrderSuccess = async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { listing: { include: { crop: true } } }
        });

        res.render('buyer/preorder-success', {
            title: 'Berhasil!',
            order,
            helpers: { formatRupiah }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
};

// GET /market/orders (Status Pesanan Pembeli)
exports.getBuyerOrders = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const orders = await prisma.order.findMany({
            where: { buyerId: userId },
            include: {
                listing: {
                    include: { crop: true, user: { include: { farmerProfile: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.render('buyer/buyer-status', {
            title: 'Pesanan Saya - TANIRA',
            orders,
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error("Get Buyer Orders Error:", error);
        res.status(500).send("Gagal memuat pesanan.");
    }
};

// GET /market/tools/:id (Detail Alat)
exports.getToolDetail = async (req, res) => {
    try {
        const toolId = parseInt(req.params.id);
        const tool = await prisma.toolListing.findUnique({
            where: { id: toolId },
            include: {
                user: { include: { farmerProfile: true } }, // Pemilik alat
                reviews: true
            }
        });

        if (!tool) return res.status(404).render('404');

        res.render('market/tools-detail', {
            title: `Detail ${tool.toolName}`,
            tool,
            helpers: { formatRupiah }
        });

    } catch (error) {
        console.error("Get Tool Detail Error:", error);
        res.status(500).send("Error");
    }
};

// GET /market/tools/order/:id (Form Sewa)
exports.getToolOrderForm = async (req, res) => {
    try {
        const toolId = parseInt(req.params.id);
        const tool = await prisma.toolListing.findUnique({ where: { id: toolId } });

        if (!tool || !tool.availability) {
            return res.status(400).send("Alat tidak tersedia.");
        }

        res.render('market/tools-order', {
            title: 'Ajukan',
            tool,
            helpers: { formatRupiah }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
};

// POST /market/tools/order (Proses Booking)
exports.submitToolOrder = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { toolId, startDate, duration } = req.body;

        const tool = await prisma.toolListing.findUnique({ where: { id: parseInt(toolId) } });
        
        // Hitung End Date
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + (parseInt(duration) - 1)); // -1 karena start date dihitung hari pertama

        // Create Booking
        const booking = await prisma.toolBooking.create({
            data: {
                userId: userId,
                toolId: parseInt(toolId),
                startDate: start,
                endDate: end,
                status: 'booked' // Default status
            }
        });

        res.json({ success: true, redirectUrl: `/market/tools/success/${booking.id}` });

    } catch (error) {
        console.error("Submit Tool Order Error:", error);
        res.status(500).json({ message: "Gagal memproses sewa." });
    }
};

// GET /market/tools/success/:id
exports.getToolSuccess = async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const booking = await prisma.toolBooking.findUnique({
            where: { id: bookingId },
            include: { tool: { include: { user: true } } } // Include pemilik alat untuk info kontak
        });

        res.render('market/tools-success', {
            title: 'Permintaan Terkirim',
            booking,
            helpers: { formatDate }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
};

// GET /market/tools/history (Riwayat Sewa)
exports.getToolHistory = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const bookings = await prisma.toolBooking.findMany({
            where: { userId: userId },
            include: {
                tool: { include: { user: true } }
            },
            orderBy: { startDate: 'desc' }
        });

        res.render('market/tools-history', {
            title: 'Riwayat Alat - TANIRA',
            bookings,
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error("Tool History Error:", error);
        res.status(500).send("Error");
    }
};

// GET /market/orders/:id (Detail Pesanan Pembeli)
exports.getBuyerOrderDetail = async (req, res) => {
    try {
        const userId = req.session.userId;
        const orderId = parseInt(req.params.id);

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                listing: {
                    include: { 
                        crop: true, 
                        user: { include: { farmerProfile: true } } // Info Petani
                    }
                }
            }
        });

        // Validasi: Pastikan order ada dan milik user yang sedang login
        if (!order || order.buyerId !== userId) {
            return res.status(403).send("Akses ditolak atau pesanan tidak ditemukan.");
        }

        // Mockup status steps untuk progress bar
        const steps = [
            { status: 'pending', label: 'Menunggu Konfirmasi', icon: 'fa-clock' },
            { status: 'paid', label: 'Dibayar', icon: 'fa-wallet' },
            { status: 'process', label: 'Diproses', icon: 'fa-box-open' },
            { status: 'finished', label: 'Selesai', icon: 'fa-check-circle' }
        ];

        // Tentukan index status saat ini
        let currentStepIndex = 0;
        if (order.status === 'paid') currentStepIndex = 1;
        else if (order.status === 'process') currentStepIndex = 2; // Jika status ini ada di enum
        else if (order.status === 'finished') currentStepIndex = 3;

        res.render('buyer/buyer-order-detail', {
            title: `Detail Pesanan #${order.id} - TANIRA`,
            order,
            steps,
            currentStepIndex,
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error("Get Buyer Order Detail Error:", error);
        res.status(500).send("Gagal memuat detail pesanan.");
    }
};