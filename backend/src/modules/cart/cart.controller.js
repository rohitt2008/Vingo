import * as cartService from './cart.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

export const getCart = asyncWrapper(async (req, res) => {
  const cart = await cartService.getCart(req.userId);
  res.status(200).json({ success: true, data: { cart } });
});

export const addToCart = asyncWrapper(async (req, res) => {
  const { restaurantId, item } = req.body;
  if (!restaurantId || !item || !item.itemId || !item.price) {
    return res.status(400).json({ success: false, message: 'restaurantId and item (itemId, price, name, etc.) are required' });
  }
  const cart = await cartService.addToCart(req.userId, restaurantId, item);
  res.status(200).json({ success: true, message: 'Added to cart', data: { cart } });
});

export const removeFromCart = asyncWrapper(async (req, res) => {
  const cart = await cartService.removeFromCart(req.userId, req.body);
  res.status(200).json({ success: true, message: 'Removed from cart', data: { cart } });
});

export const clearCart = asyncWrapper(async (req, res) => {
  await cartService.clearCart(req.userId);
  res.status(200).json({ success: true, message: 'Cart cleared' });
});
