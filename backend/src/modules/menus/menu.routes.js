import express from 'express';
import * as menuCtrl from './menu.controller.js';
import auth from '../../middleware/auth.js';
import requireRole from '../../middleware/requireRole.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────

router.get('/:restaurantId', menuCtrl.getMenu);

// ── Owner Routes ──────────────────────────────────────────────────────

// Categories
router.post('/:restaurantId/categories', auth, requireRole('owner', 'admin'), menuCtrl.addCategory);
router.put('/:restaurantId/categories/:categoryId', auth, requireRole('owner', 'admin'), menuCtrl.updateCategory);
router.delete('/:restaurantId/categories/:categoryId', auth, requireRole('owner', 'admin'), menuCtrl.deleteCategory);

// Items
router.post('/:restaurantId/categories/:categoryId/items', auth, requireRole('owner', 'admin'), upload.single('image'), menuCtrl.addItem);
router.put('/:restaurantId/categories/:categoryId/items/:itemId', auth, requireRole('owner', 'admin'), upload.single('image'), menuCtrl.updateItem);
router.delete('/:restaurantId/categories/:categoryId/items/:itemId', auth, requireRole('owner', 'admin'), menuCtrl.deleteItem);
router.patch('/:restaurantId/categories/:categoryId/items/:itemId/toggle', auth, requireRole('owner', 'admin'), menuCtrl.toggleItemAvailability);

export default router;
