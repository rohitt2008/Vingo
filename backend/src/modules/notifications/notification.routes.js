import express from 'express';
import * as notifCtrl from './notification.controller.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

router.get('/', auth, notifCtrl.getNotifications);
router.patch('/:id/read', auth, notifCtrl.markAsRead);
router.patch('/read-all', auth, notifCtrl.markAllAsRead);

export default router;
