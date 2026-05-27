import * as menuService from './menu.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

export const getMenu = asyncWrapper(async (req, res) => {
  const menu = await menuService.getMenuByRestaurant(req.params.restaurantId);
  res.status(200).json({ success: true, data: { menu } });
});

export const addCategory = asyncWrapper(async (req, res) => {
  const menu = await menuService.addCategory(req.params.restaurantId, req.userId, req.body);
  res.status(201).json({ success: true, message: 'Category added', data: { menu } });
});

export const updateCategory = asyncWrapper(async (req, res) => {
  const menu = await menuService.updateCategory(req.params.restaurantId, req.userId, req.params.categoryId, req.body);
  res.status(200).json({ success: true, message: 'Category updated', data: { menu } });
});

export const deleteCategory = asyncWrapper(async (req, res) => {
  const menu = await menuService.deleteCategory(req.params.restaurantId, req.userId, req.params.categoryId);
  res.status(200).json({ success: true, message: 'Category deleted', data: { menu } });
});

export const addItem = asyncWrapper(async (req, res) => {
  const menu = await menuService.addItem(req.params.restaurantId, req.userId, req.params.categoryId, req.body, req.file);
  res.status(201).json({ success: true, message: 'Item added', data: { menu } });
});

export const updateItem = asyncWrapper(async (req, res) => {
  const menu = await menuService.updateItem(req.params.restaurantId, req.userId, req.params.categoryId, req.params.itemId, req.body, req.file);
  res.status(200).json({ success: true, message: 'Item updated', data: { menu } });
});

export const deleteItem = asyncWrapper(async (req, res) => {
  const menu = await menuService.deleteItem(req.params.restaurantId, req.userId, req.params.categoryId, req.params.itemId);
  res.status(200).json({ success: true, message: 'Item deleted', data: { menu } });
});

export const toggleItemAvailability = asyncWrapper(async (req, res) => {
  const menu = await menuService.toggleItemAvailability(req.params.restaurantId, req.userId, req.params.categoryId, req.params.itemId);
  res.status(200).json({ success: true, message: 'Availability toggled', data: { menu } });
});
