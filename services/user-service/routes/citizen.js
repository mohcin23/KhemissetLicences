const express = require('express');
const router = express.Router();
const citizenCtrl = require('../controllers/citizenController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/profile', citizenCtrl.getProfile);
router.put('/profile', citizenCtrl.updateProfile);
router.get('/mes-demandes', citizenCtrl.getMyDemandes);

module.exports = router;
