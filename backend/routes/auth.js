const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives d inscription. Réessayez dans une heure.' }
});

router.post('/login', loginLimiter, authCtrl.login);
router.post('/register', registerLimiter, authCtrl.register);
router.post('/register-citizen', registerLimiter, authCtrl.registerCitizen);
router.get('/me', authMiddleware, authCtrl.me);

module.exports = router;
