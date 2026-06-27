const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 5 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives d\'inscription. Réessayez dans une heure.' }
});

router.post('/login', loginLimiter, authCtrl.login);
router.post('/register', registerLimiter, authCtrl.register);
router.post('/register-citizen', registerLimiter, authCtrl.registerCitizen);
router.post('/forgot-password', loginLimiter, authCtrl.forgotPassword);
router.post('/verify-code', loginLimiter, authCtrl.verifyCode);
router.post('/reset-password', loginLimiter, authCtrl.resetPassword);
router.get('/me', authMiddleware, authCtrl.me);

module.exports = router;
