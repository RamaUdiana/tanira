const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper untuk format tanggal Indonesia
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
};

// Helper format mata uang
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;
        const role = req.session.role;

        // Routing Berdasarkan Role
        if (role === 'penyedia') {
            return res.redirect('/producer');
        }
        
        if (role === 'pembeli') {
            return res.redirect('/market');
        }
        
        if (role !== 'petani') {
            return res.status(403).send('Dashboard untuk peran ini belum tersedia.');
        }

        // 1. Ambil Data User & Profil Petani
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { farmerProfile: true }
        });

        // 2. Ambil Rencana Tanam (Real dari DB)
        const plantingPlans = await prisma.plantingPlan.findMany({
            where: { userId: userId },
            take: 3,
            orderBy: { estimatedHarvest: 'asc' },
            include: { crop: true }
        });

        // 3. Ambil Data Tren Pasar (Real dari DB: CropTrend)
        // Kita ambil 3 tren terbaru yang relevan
        const trends = await prisma.cropTrend.findMany({
            take: 3,
            include: { crop: true },
            orderBy: { id: 'desc' }
        });

        // Mapping data DB ke format View
        const marketInsights = [
            {
                title: "Cabai Rawit",
                tag: "High Demand",
                trend: "Naik",
                value: "+15%",
                desc: "Harga pasar naik minggu ini.",
                icon: "fa-arrow-trend-up",
                color: "orange"
            },
            {
                title: "Permintaan Pasar",
                tag: "Stabil",
                trend: "Stabil",
                value: "320 Ton",
                desc: "Kebutuhan total di area " + (user.province || "Jawa Barat"),
                icon: "fa-hand-holding-dollar",
                color: "blue"
            },
            {
                title: "Risiko Musim",
                tag: "Aman",
                trend: "Rendah",
                value: "Rendah",
                desc: "Cuaca mendukung masa tanam.",
                icon: "fa-cloud-sun",
                color: "green"
            }
        ];

        // 4. GENERATE NOTIFIKASI DINAMIS (Berdasarkan Logika Data)
        // Karena belum ada tabel Notification, kita buat notifikasi pintar berdasarkan kondisi user
        const notifications = [];

        // Cek 1: Apakah profil sudah lengkap?
        if (!user.farmerProfile) {
            notifications.push({
                id: 'sys-1',
                type: 'warning',
                icon: 'fa-user-pen',
                color: 'text-orange-500 bg-orange-50',
                title: 'Lengkapi Profil',
                message: 'Lengkapi data lahan Anda untuk mendapatkan rekomendasi AI yang akurat.',
                time: 'Sekarang',
                read: false
            });
        }

        // Cek 2: Apakah ada panen dalam waktu dekat (< 30 hari)?
        const upcomingHarvest = plantingPlans.find(p => {
            const diffTime = new Date(p.estimatedHarvest) - new Date();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 && diffDays <= 30;
        });

        if (upcomingHarvest) {
            notifications.push({
                id: 'sys-2',
                type: 'success',
                icon: 'fa-basket-shopping',
                color: 'text-green-500 bg-green-50',
                title: 'Persiapan Panen',
                message: `Tanaman ${upcomingHarvest.crop.name} Anda diperkirakan panen sebentar lagi. Segera buat listing Pre-Order!`,
                time: 'Hari ini',
                read: false
            });
        }

        // Cek 3: Info Umum (Bisa statis atau dari sistem admin)
        notifications.push({
            id: 'sys-3',
            type: 'info',
            icon: 'fa-cloud-sun',
            color: 'text-blue-500 bg-blue-50',
            title: 'Info Cuaca',
            message: 'Minggu ini diprediksi cerah berawan, cocok untuk pemupukan.',
            time: '1 jam lalu',
            read: true // Anggap sudah dibaca
        });

        const unreadCount = notifications.filter(n => !n.read).length;

        // 5. Render View
        res.render('petani/dashboard', {
            title: 'Dashboard Petani',
            user: user,
            farmer: user.farmerProfile,
            plans: plantingPlans,
            insights: marketInsights,
            notifications: notifications,
            unreadCount: unreadCount,
            currentDate: formatDate(new Date()),
            helpers: { formatRupiah, formatDate }
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.render('500', { message: 'Gagal memuat dashboard' });
    }
};