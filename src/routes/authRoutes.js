const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
// Import Middleware
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Public Routes (Tamu bisa akses)
router.get('/register', authController.registerPage);
router.post('/register', authController.register);
router.get('/verify/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

router.get('/login', authController.loginPage);
router.post('/login', authController.login);

router.get('/forgot-password', authController.forgotPasswordPage);
router.post('/forgot-password', authController.requestPasswordReset);
router.get('/reset-password/:token', authController.resetPasswordPage);
router.post('/reset-password/:token', authController.resetPassword);

// Protected Routes (Harus Login)
router.get('/logout', isAuthenticated, authController.logout);

// Onboarding Routes (Perlu login session, tapi role masih none)
router.get('/onboarding', authController.onboardingPage);
router.post('/onboarding', authController.submitOnboarding);

module.exports = router;