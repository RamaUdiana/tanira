# 🌾 TANIRA  
**Ekosistem Pertanian Digital Terpadu**

TANIRA adalah platform berbasis web yang dirancang untuk merevolusi cara **petani, pembeli, dan penyedia alat pertanian** berinteraksi.  
Melalui fitur **Smart Planting** dan **Marketplace Panen**, TANIRA memberikan kepastian pasar bagi petani serta akses langsung ke hasil bumi berkualitas bagi pembeli.

---

## 🌟 Fitur Utama

### 🌱 Petani (Farmers)
- **Smart Planting**  
  Perencanaan masa tanam dengan rekomendasi berbasis data untuk memaksimalkan hasil panen.
- **Simulasi Tanam**  
  Kalkulator estimasi biaya, potensi panen, dan keuntungan sebelum mulai menanam.
- **Manajemen Panen**  
  Ubah rencana tanam menjadi listing penjualan (*Pre-Order*) untuk mendapatkan pembeli lebih awal.
- **Sewa Alat**  
  Cari dan sewa alat pertanian modern dari penyedia lokal.

### 🛒 Pembeli (Buyers)
- **Marketplace Panen**  
  Beli hasil panen langsung dari petani dengan sistem *Pre-Order* untuk harga yang lebih adil.
- **Transparansi**  
  Pantau status perkembangan tanaman secara real-time (dari tanam hingga panen).
- **Manajemen Pesanan**  
  Dashboard khusus untuk melacak riwayat dan status pembelian.

### 🚜 Penyedia Alat (Producers / Partners)
- **Manajemen Inventaris**  
  Tambah dan kelola alat pertanian atau produk (bibit, pupuk) untuk disewakan atau dijual.
- **Manajemen Sewa**  
  Terima dan proses permintaan sewa dari petani.
- **Dashboard Statistik**  
  Pantau performa penyewaan dan ketersediaan alat.

---

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, Express.js  
- **Database & ORM**: MySQL, Prisma  
- **Frontend**: EJS (Templating Engine)  
- **Styling**: Tailwind CSS  
- **Autentikasi**: Express Session, Bcrypt  
- **Upload File**: Multer  

---

## 🚀 Instalasi & Menjalankan Project

### Prasyarat
- Node.js v16+
- MySQL Server
- Git

### Langkah-langkah

#### 1. Clone Repository
```bash
git clone https://github.com/username/tanira.git
cd tanira
````

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Konfigurasi Database

Buat file `.env` di root folder:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/tanira_db"
SESSION_SECRET="rahasia_dapur_tanira_123"

# SMTP (opsional, jika menggunakan fitur email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=emailanda@gmail.com
SMTP_PASS=password_app_anda
SMTP_SECURE=false
```

#### 4. Migrasi Database (Prisma)

```bash
npx prisma migrate dev --name init
```

#### 5. Jalankan Server

Mode development:

```bash
npm run dev
```

Atau mode standar:

```bash
node src/app.js
```

#### 6. Akses Aplikasi

Buka browser dan kunjungi:

```
http://localhost:3000
```

---

## 📂 Struktur Folder

```
tanira/
├── prisma/
│   └── schema.prisma        # Skema Database
├── public/                  # File statis (CSS, gambar, uploads)
├── src/
│   ├── controllers/         # Logika bisnis
│   ├── middlewares/         # Middleware (auth, upload, dll)
│   ├── routes/              # Routing aplikasi
│   ├── views/               # Template EJS
│   │   ├── auth/
│   │   ├── buyer/
│   │   ├── market/
│   │   ├── petani/
│   │   ├── producer/
│   │   └── ...
│   └── app.js               # Entry point aplikasi
├── package.json
└── README.md
```

---

## 🔐 Akun Demo (Opsional)

| Role     | Email                                           | Password    |
| -------- | ----------------------------------------------- | ----------- |
| Petani   | [petani@tanira.com](mailto:petani@tanira.com)   | password123 |
| Pembeli  | [pembeli@tanira.com](mailto:pembeli@tanira.com) | password123 |
| Penyedia | [mitra@tanira.com](mailto:mitra@tanira.com)     | password123 |

> Pastikan akun ini tersedia di database (seed atau input manual).

---

## 🤝 Kontribusi

Kami sangat terbuka untuk kontribusi:

1. Fork repository
2. Buat branch fitur

   ```bash
   git checkout -b fitur-keren
   ```
3. Commit perubahan

   ```bash
   git commit -m "Menambahkan fitur keren"
   ```
4. Push ke branch

   ```bash
   git push origin fitur-keren
   ```
5. Buat Pull Request

---

## 📄 Lisensi

Proyek ini menggunakan **MIT License**.
Lihat file `LICENSE` untuk detail lengkap.

---

<p align="center">
Dibuat dengan ❤️ untuk Pertanian Indonesia 🇮🇩
</p>
