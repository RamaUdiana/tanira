const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- MULTER CONFIG (Upload Alat) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/tools';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'tool-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (/jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak didukung!'));
        }
    }
});

exports.uploadToolImage = upload.single('image');

// Helper Format
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

// Helper Time Ago (Sederhana)
const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " tahun lalu";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " bulan lalu";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " hari lalu";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " jam lalu";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " menit lalu";
    return Math.floor(seconds) + " detik lalu";
};

// GET /producer (Dashboard)
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // 1. Data Alat
        const tools = await prisma.toolListing.findMany({
            where: { userId: userId },
            orderBy: { id: 'desc' }
        });
        const activeTools = tools.filter(t => t.availability).length;
        
        // 2. Data Sewa Berjalan (Active)
        const activeBookingsCount = await prisma.toolBooking.count({
            where: {
                tool: { userId: userId },
                status: 'booked',
                endDate: { gte: new Date() }
            }
        });

        // 3. DATA NOTIFIKASI (Permintaan Pending) - BARU
        const pendingBookings = await prisma.toolBooking.findMany({
            where: {
                tool: { userId: userId },
                status: 'pending'
            },
            include: { tool: true, user: true },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        // Mapping ke format notifikasi view
        const notifications = pendingBookings.map(b => ({
            id: b.id,
            title: 'Permintaan Sewa Baru',
            message: `${b.user.name} ingin menyewa ${b.tool.toolName}`,
            time: timeAgo(b.createdAt),
            read: false,
            link: '/producer/requests' // Link ke halaman manajemen request
        }));

        res.render('producer/dashboard', {
            title: 'Dashboard Produsen - TANIRA',
            user,
            stats: {
                activeTools,
                requests: activeBookingsCount, // Ini untuk kartu statistik "Sewa Berjalan"
                storeStatus: "Buka"
            },
            notifications, // Data notifikasi dikirim ke view
            recentTools: tools.slice(0, 3),
            helpers: { formatRupiah }
        });
    } catch (error) {
        console.error("Producer Dashboard Error:", error);
        res.status(500).send("Server Error");
    }
};

// --- FITUR BARU ---

// GET /producer/my-tools
exports.getMyToolsPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const tools = await prisma.toolListing.findMany({
            where: { userId: userId },
            orderBy: { id: 'desc' }
        });

        res.render('producer/my-tools', {
            title: 'Alat Saya - TANIRA',
            tools: tools,
            helpers: { formatRupiah }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Gagal memuat halaman alat.");
    }
};

// GET /producer/add-tool
exports.getAddToolPage = (req, res) => {
    res.render('producer/add-tool', {
        title: 'Tambah Alat - TANIRA'
    });
};

// POST /producer/add-tool
exports.createTool = async (req, res) => {
    try {
        const userId = req.session.userId;
        // Ambil transactionType dari body
        const { name, category, price, description, location, status, transactionType } = req.body;
        
        const imageUrl = req.file ? `/uploads/tools/${req.file.filename}` : null;
        const isAvailable = status === 'Tersedia';

        await prisma.toolListing.create({
            data: {
                userId: userId,
                toolName: name,
                category: category,
                // Simpan tipe transaksi (default 'sewa' jika kosong)
                transactionType: transactionType || 'sewa', 
                pricePerDay: parseFloat(price),
                description: description,
                location: location,
                availability: isAvailable,
                imageUrl: imageUrl
            }
        });

        res.json({ success: true, redirectUrl: '/producer/my-tools' });

    } catch (error) {
        console.error("Create Tool Error:", error);
        res.status(500).json({ message: "Gagal menambahkan alat." });
    }
};

// POST /producer/tool/toggle/:id
exports.toggleToolStatus = async (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        const { availability } = req.body; // boolean

        await prisma.toolListing.update({
            where: { id: listingId },
            data: { availability: availability }
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal update status." });
    }
};

// GET /producer/tool/:id (Detail Alat)
exports.getToolDetail = async (req, res) => {
    try {
        const userId = req.session.userId;
        const toolId = parseInt(req.params.id);

        const tool = await prisma.toolListing.findUnique({
            where: { id: toolId },
            include: { bookings: true } // Include riwayat booking jika perlu
        });

        // Validasi Kepemilikan
        if (!tool || tool.userId !== userId) {
            return res.status(403).send("Akses ditolak.");
        }

        res.render('producer/tool-detail', {
            title: `Detail ${tool.toolName} - TANIRA`,
            tool,
            helpers: { formatRupiah }
        });

    } catch (error) {
        console.error("Get Tool Detail Error:", error);
        res.status(500).send("Terjadi kesalahan sistem.");
    }
};

// GET /producer/requests (Daftar Permintaan Sewa)
exports.getRequests = async (req, res) => {
    try {
        const userId = req.session.userId;

        // Ambil semua booking untuk alat milik user ini
        const requests = await prisma.toolBooking.findMany({
            where: {
                tool: { userId: userId }
            },
            include: {
                tool: true, // Info alat yang disewa
                user: { include: { farmerProfile: true } } // Info penyewa (petani)
            },
            orderBy: { startDate: 'desc' } // Urutkan dari yang terbaru
        });

        res.render('producer/producer-requests', {
            title: 'Permintaan Masuk - TANIRA',
            requests,
            helpers: { 
                formatRupiah,
                formatDate: (date) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            }
        });

    } catch (error) {
        console.error("Get Requests Error:", error);
        res.status(500).send("Gagal memuat permintaan.");
    }
};

// POST /producer/request/:id/action (Terima/Tolak Sewa)
exports.handleRequestAction = async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { action } = req.body; // 'approve' atau 'reject'

        // Mapping status action ke enum BookingStatus
        // Asumsi: 'approve' -> 'booked', 'reject' -> (hapus atau status cancelled jika ada enumnya)
        // Karena enum BookingStatus cuma 'booked' dan 'completed', kita asumsikan 'booked' adalah status aktif.
        // Jika reject, mungkin kita hapus saja recordnya atau butuh status 'cancelled' di schema.
        
        if (action === 'approve') {
            await prisma.toolBooking.update({
                where: { id: bookingId },
                data: { status: 'booked' }
            });
        } else if (action === 'reject') {
            // Hapus booking jika ditolak (Simple approach)
            await prisma.toolBooking.delete({ where: { id: bookingId } });
        } else if (action === 'complete') {
             await prisma.toolBooking.update({
                where: { id: bookingId },
                data: { status: 'completed' }
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error("Handle Request Error:", error);
        res.status(500).json({ message: "Gagal memproses permintaan." });
    }
};

// GET /producer/edit-tool/:id
exports.getEditToolPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const toolId = parseInt(req.params.id);

        const tool = await prisma.toolListing.findUnique({ where: { id: toolId } });

        if (!tool || tool.userId !== userId) {
            return res.status(403).send("Akses ditolak.");
        }

        res.render('producer/edit-tool', {
            title: `Edit ${tool.toolName}`,
            tool,
            helpers: { formatRupiah }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
};

// POST /producer/edit-tool/:id
exports.updateTool = async (req, res) => {
    try {
        const toolId = parseInt(req.params.id);
        const { name, category, price, description, location, status, transactionType } = req.body;
        
        const updateData = {
            toolName: name,
            category,
            transactionType, // Update tipe transaksi
            pricePerDay: parseFloat(price),
            description,
            location,
            availability: status === 'Tersedia'
        };

        if (req.file) {
            updateData.imageUrl = `/uploads/tools/${req.file.filename}`;
        }

        await prisma.toolListing.update({
            where: { id: toolId },
            data: updateData
        });

        res.json({ success: true, redirectUrl: `/producer/tool/${toolId}` });

    } catch (error) {
        console.error("Update Tool Error:", error);
        res.status(500).json({ message: "Gagal update alat." });
    }
};
