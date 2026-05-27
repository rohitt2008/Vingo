import express from 'express';
import * as restaurantCtrl from './restaurant.controller.js';
import auth from '../../middleware/auth.js';
import requireRole from '../../middleware/requireRole.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// ── Public Routes ─────────────────────────────────────────────────────

router.get('/', restaurantCtrl.listRestaurants);
router.get('/nearby', restaurantCtrl.getNearby);
router.get('/:id', restaurantCtrl.getRestaurant);

// ── Owner Routes ──────────────────────────────────────────────────────

router.post('/', auth, requireRole('owner'), upload.single('coverImage'), restaurantCtrl.createRestaurant);
router.get('/owner/mine', auth, requireRole('owner'), restaurantCtrl.getMyRestaurant);
router.put('/:id', auth, requireRole('owner'), upload.single('coverImage'), restaurantCtrl.updateRestaurant);
router.patch('/:id/toggle', auth, requireRole('owner'), restaurantCtrl.toggleStatus);
router.delete('/:id', auth, requireRole('owner', 'admin'), restaurantCtrl.deleteRestaurant);

// ── Admin Routes ──────────────────────────────────────────────────────

router.get('/admin/all', auth, requireRole('admin'), restaurantCtrl.listAllRestaurants);
router.patch('/:id/approve', auth, requireRole('admin'), restaurantCtrl.approveRestaurant);

export default router;
