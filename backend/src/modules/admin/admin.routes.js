import express from 'express';
import * as adminCtrl from './admin.controller.js';
import auth from '../../middleware/auth.js';
import requireRole from '../../middleware/requireRole.js';

const router = express.Router();

// All routes require authenticated Admin privileges
router.use(auth, requireRole('admin'));

router.get('/metrics', adminCtrl.getMetrics);
router.get('/users', adminCtrl.getUsers);
router.patch('/users/:id/role', adminCtrl.updateUserRole);
router.delete('/users/:id', adminCtrl.deleteUser);

router.get('/restaurants', adminCtrl.getRestaurants);
router.patch('/restaurants/:id/approve', adminCtrl.approveRestaurant);

export default router;
