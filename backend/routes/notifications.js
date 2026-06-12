const express = require('express');
const router = express.Router();
const notificationsCtrl = require('../controllers/notificationsController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(checkRole(['admin', 'agent', 'lecteur', 'citizen']));

router.get('/', notificationsCtrl.getNotifications);
router.get('/count', notificationsCtrl.getUnreadCount);
router.patch('/:id/read', notificationsCtrl.markAsRead);
router.patch('/read-all', notificationsCtrl.markAllRead);

module.exports = router;
