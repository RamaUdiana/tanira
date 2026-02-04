const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper Format Rupiah
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

exports.index = async (req, res) => {
    // ... (Kode index yang sudah ada sebelumnya tetap sama) ...
    // Saya sertakan kembali setup dasarnya agar tidak error jika di-copy paste
    try {
        const userId = req.session.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { farmerProfile: true }
        });

        const location = user.province || (user.farmerProfile?.location || 'Lokasi Belum Diatur');
        const landArea = user.farmerProfile?.landArea || 0;

        // Mock Data (Sama seperti sebelumnya)
        const mainRecommendation = {
            name: "Cabai Rawit Merah",
            score: 98,
            image: "https://images.unsplash.com/photo-1546860255-95536c19724e?q=80&w=600&auto=format&fit=crop",
            trend: "+15%",
            trendStatus: "naik",
            description: `Permintaan pasar di ${location} meningkat tajam.`,
            duration: "3 - 4 Bulan",
            yield: "8-10 Ton/Ha"
        };
        const priceHistory = [
            { label: "Mgg 1", price: 38000 }, { label: "Mgg 2", price: 40000 },
            { label: "Mgg 3", price: 42000 }, { label: "Ini", price: 45000, isCurrent: true }
        ];
        const maxPrice = Math.max(...priceHistory.map(p => p.price)) * 1.1;
        const chartData = priceHistory.map(item => ({ ...item, height: (item.price / maxPrice) * 100 }));
        const alternatives = [
             { name: "Jagung Manis", price: 8500, trend: "Stabil", risk: "Rendah", image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=200&auto=format&fit=crop" },
             { name: "Padi Ciherang", price: 6200, trend: "Turun", trendDown: true, risk: "Standar", image: "https://images.unsplash.com/photo-1536617621572-1d5f1e6269a0?q=80&w=200&auto=format&fit=crop" }
        ];

        res.render('petani/smart-planting', {
            title: 'Smart Planting - TANIRA',
            user, location, landArea,
            rec: mainRecommendation, chart: chartData, alternatives,
            helpers: { formatRupiah }
        });
    } catch (error) {
        console.error(error);
        res.render('500');
    }
};

// --- HALAMAN SIMULASI (GET) ---
exports.simulation = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Ambil data lahan user untuk mengisi default input
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { farmerProfile: true }
        });

        const landArea = user.farmerProfile?.landArea || 1; // Default 1 Ha jika belum diatur

        // Data Parameter Tanaman (Mockup Cabai Rawit Merah)
        // Idealnya data ini diambil dari database tabel `Crop`
        const cropData = {
            name: "Cabai Rawit Merah",
            marketPrice: 45000, // Harga/kg
            yieldPerHa: 8000,   // Hasil panen (kg) per Hektar
            duration: 4,        // Bulan
            costs: {
                seeds: 2000000,      // Biaya Bibit/Ha
                fertilizer: 5000000, // Biaya Pupuk/Ha
                labor: 8000000,      // Biaya Tenaga Kerja/Ha
                others: 3000000      // Biaya Lain-lain/Ha
            }
        };

        res.render('petani/simulation', {
            title: 'Simulasi Tanam - TANIRA',
            user: user,
            landArea: landArea,
            crop: cropData,
            helpers: { formatRupiah }
        });

    } catch (error) {
        console.error("Simulation Error:", error);
        res.status(500).send("Terjadi kesalahan sistem");
    }
};

// --- SIMPAN RENCANA (POST) ---
exports.savePlan = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { cropName, landArea, totalYield, expectedProfit, duration } = req.body;

        // 1. Cari atau Buat Crop (Mockup Logic karena belum ada master data Crop yang lengkap)
        let crop = await prisma.crop.findFirst({ where: { name: cropName } });
        
        if (!crop) {
            // Jika tanaman belum ada di DB, buat baru otomatis
            crop = await prisma.crop.create({
                data: {
                    name: cropName,
                    category: 'Sayuran',
                    growthDuration: parseInt(duration) || 4,
                    avgYieldPerHa: 8000 
                }
            });
        }

        // 2. Hitung Estimasi Tanggal Panen
        const harvestDate = new Date();
        harvestDate.setMonth(harvestDate.getMonth() + (parseInt(duration) || 4));

        // 3. Simpan ke Database
        const newPlan = await prisma.plantingPlan.create({
            data: {
                userId: userId,
                cropId: crop.id,
                landArea: parseFloat(landArea),
                estimatedHarvest: harvestDate,
                expectedYield: parseFloat(totalYield), // Disimpan dalam Ton atau Kg (sesuai kesepakatan)
                expectedProfit: parseFloat(expectedProfit),
                riskLevel: 'rendah' // Default mockup
            }
        });

        // 4. Berikan Response Redirect
        res.json({ 
            success: true, 
            redirectUrl: `/smart-planting/success/${newPlan.id}` 
        });

    } catch (error) {
        console.error("Save Plan Error:", error);
        res.status(500).json({ message: "Gagal menyimpan rencana tanam." });
    }
};

// --- HALAMAN SUKSES (GET) ---
exports.successPage = async (req, res) => {
    try {
        const planId = parseInt(req.params.id);
        
        const plan = await prisma.plantingPlan.findUnique({
            where: { id: planId },
            include: { crop: true }
        });

        if (!plan) {
            return res.redirect('/smart-planting');
        }

        res.render('petani/plan-success', {
            title: 'Rencana Berhasil Disimpan',
            plan: plan,
            helpers: { formatRupiah }
        });

    } catch (error) {
        console.error("Success Page Error:", error);
        res.status(500).send("Terjadi kesalahan");
    }
};