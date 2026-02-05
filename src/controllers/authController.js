const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

// --- KONFIGURASI EMAIL (SMTP) ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true untuk port 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Helper: Kirim Email Verifikasi
const sendVerificationEmail = async (email, token) => {
    const link = `http://localhost:3000/auth/verify/${token}`;
    
    const mailOptions = {
        from: `"Tanira Team" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verifikasi Akun Tanira Anda',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #2F7D32; text-align: center;">Selamat Datang di Tanira!</h2>
                <p>Halo,</p>
                <p>Terima kasih telah mendaftar. Silakan klik tombol di bawah ini untuk memverifikasi email Anda:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background-color: #2F7D32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verifikasi Email</a>
                </div>
                <p style="font-size: 12px; color: #666; text-align: center;">Atau salin link ini ke browser Anda:<br>${link}</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Verifikasi dikirim ke: ${email}`);
        return true;
    } catch (error) {
        console.error('[EMAIL ERROR]', error);
        return false;
    }
};

// Helper: Kirim Email Reset Password
const sendResetPasswordEmail = async (email, token) => {
    const link = `http://localhost:3000/auth/reset-password/${token}`;
    
    const mailOptions = {
        from: `"Tanira Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Password Akun Tanira',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #6D4C41; text-align: center;">Permintaan Reset Password</h2>
                <p>Klik tombol di bawah ini untuk membuat password baru:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background-color: #6D4C41; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                <p style="font-size: 12px; color: #666; text-align: center;">Link ini kadaluarsa dalam 1 jam.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Reset Password ke: ${email}`);
        return true;
    } catch (error) {
        console.error('[EMAIL ERROR]', error);
        return false;
    }
};

// --- REGISTRASI ---

exports.registerPage = (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.render('auth/register', { 
        title: 'Daftar Akun',
        error: null 
    });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render('auth/register', {
        title: 'Daftar Akun',
        error: 'Password dan konfirmasi password tidak cocok!'
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Daftar Akun',
        error: 'Email ini sudah terdaftar. Silakan login.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'none',
        isVerified: true,          // 🔥 AUTO VERIFIED
        verificationToken: null,  // 🔥 HAPUS TOKEN
      }
    });

    // ⛔ JANGAN kirim email
    return res.redirect('/auth/login');

  } catch (error) {
    console.error('Register Error:', error);
    return res.render('auth/register', {
      title: 'Daftar Akun',
      error: 'Terjadi kesalahan pada sistem. Silakan coba lagi.'
    });
  }
};

// --- VERIFIKASI EMAIL ---

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await prisma.user.findFirst({
            where: { verificationToken: token }
        });

        if (!user) {
            return res.status(400).send('Link tidak valid atau kadaluarsa.');
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null
            }
        });

        res.render('auth/verify-success');

    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).send('Terjadi kesalahan saat memverifikasi email.');
    }
};

// --- RESEND VERIFIKASI ---

exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return res.status(404).json({ message: 'Email tidak ditemukan.' });
        if (user.isVerified) return res.status(400).json({ message: 'Akun sudah terverifikasi.' });

        const newToken = crypto.randomBytes(32).toString('hex');

        await prisma.user.update({
            where: { email },
            data: { verificationToken: newToken }
        });

        const sent = await sendVerificationEmail(email, newToken);

        if (sent) res.json({ success: true, message: 'Link verifikasi baru telah dikirim.' });
        else res.status(500).json({ message: 'Gagal mengirim email.' });

    } catch (error) {
        console.error('Resend Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan sistem.' });
    }
};

// --- LOGIN ---

exports.loginPage = (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    const successMsg = req.query.verified ? 'Email berhasil diverifikasi! Silakan login.' : null;
    res.render('auth/login', { 
        title: 'Masuk Akun',
        error: null,
        success: successMsg
    });
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            return res.render('auth/login', { title: 'Masuk Akun', error: 'Email atau password salah.', success: null });
        }

        if (!user.isVerified) {
             return res.render('auth/login', { title: 'Masuk Akun', error: 'Akun belum diverifikasi. Cek email Anda.', success: null });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
             return res.render('auth/login', { title: 'Masuk Akun', error: 'Email atau password salah.', success: null });
        }

        // Set Session
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.user = { 
            name: user.name,
            email: user.email,
            role: user.role
        };

        // CEK ROLE NONE -> Redirect Onboarding
        if (user.role === 'none') {
            return req.session.save(() => {
                res.redirect('/auth/onboarding');
            });
        }

        req.session.save(() => {
            res.redirect('/dashboard');
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.render('auth/login', { title: 'Masuk Akun', error: 'Terjadi kesalahan sistem.', success: null });
    }
};

// --- LOGOUT ---

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout Error:', err);
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
};

// --- LUPA PASSWORD ---

exports.forgotPasswordPage = (req, res) => {
    res.render('auth/forgot-password', { title: 'Lupa Password', error: null, success: null });
};

exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.render('auth/forgot-password', {
                title: 'Lupa Password',
                error: 'Email tidak terdaftar.',
                success: null
            });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 Jam

        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: token,
                expiresAt: expiresAt
            }
        });

        await sendResetPasswordEmail(email, token);

        res.render('auth/forgot-password', {
            title: 'Lupa Password',
            error: null,
            success: 'Link reset password telah dikirim ke email Anda.'
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.render('auth/forgot-password', { title: 'Lupa Password', error: 'Terjadi kesalahan sistem.', success: null });
    }
};

exports.resetPasswordPage = async (req, res) => {
    const { token } = req.params;
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
        return res.render('auth/reset-failed');
    }

    res.render('auth/reset-password', { title: 'Reset Password', token: token, error: null });
};

exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    try {
        if (newPassword !== confirmPassword) {
            return res.render('auth/reset-password', { title: 'Reset Password', token, error: 'Konfirmasi password tidak cocok.' });
        }

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!resetToken || resetToken.expiresAt < new Date()) {
            return res.render('auth/reset-failed');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedPassword }
        });

        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

        res.render('auth/reset-success');

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.render('auth/reset-password', { title: 'Reset Password', token, error: 'Gagal mereset password.' });
    }
};

// --- ONBOARDING (MENENTUKAN ROLE) ---

exports.onboardingPage = async (req, res) => {
    if (!req.session.userId) return res.redirect('/auth/login');
    
    // Cek status role terbaru dari DB
    const user = await prisma.user.findUnique({ where: { id: req.session.userId }});
    
    // Jika role sudah bukan 'none', tidak perlu onboarding lagi
    if (user.role !== 'none') {
        return res.redirect('/dashboard');
    }

    res.render('auth/onboarding', { user: user });
};

exports.submitOnboarding = async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const { role, fullname, phone, province } = req.body; 

        // Validasi Role
        // Catatan: Pastikan 'produsen' ada di sini jika Anda mengizinkannya, 
        // atau gunakan 'penyedia' jika itu istilah di database Anda.
        const validRoles = ['petani', 'pembeli', 'penyedia', 'produsen']; 
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Role tidak valid' });
        }

        // Update User
        const updatedUser = await prisma.user.update({
            where: { id: req.session.userId },
            data: {
                role: role,
                name: fullname,
                phone: phone,
                province: province
            }
        });

        // Update Session
        req.session.role = updatedUser.role;
        req.session.user.role = updatedUser.role;
        req.session.user.name = updatedUser.name;

        req.session.save(() => {
            // LOGIC PENENTUAN ROUTE DAN QUERY PARAMETER
            let targetUrl = '/dashboard'; // Default URL jika tidak ada kondisi khusus

            if (role === 'petani') {
                // Khusus Petani: Route dashboard biasa + tutorial aktif
                targetUrl = '/dashboard?tutorial=true';
            } else if (role === 'penyedia') {
                // Khusus Produsen/Penyedia: Route berbeda (tanpa tutorial)
                // Ganti '/dashboard-produsen' dengan route asli Anda
                targetUrl = '/producer?tutorial=true'; 
            } 

            // Kirim URL dinamis tersebut ke frontend
            res.json({ success: true, redirectUrl: targetUrl });
        });

    } catch (error) {
        console.error('Onboarding Error:', error);
        res.status(500).json({ message: 'Gagal menyimpan data.' });
    }
};
