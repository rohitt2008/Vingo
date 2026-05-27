import * as restaurantService from './restaurant.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

export const createRestaurant = asyncWrapper(async (req, res) => {
  const restaurant = await restaurantService.createRestaurant(req.userId, req.body, req.file);
  res.status(201).json({ success: true, message: 'Restaurant created', data: { restaurant } });
});

export const updateRestaurant = asyncWrapper(async (req, res) => {
  const restaurant = await restaurantService.updateRestaurant(req.params.id, req.userId, req.body, req.file);
  res.status(200).json({ success: true, message: 'Restaurant updated', data: { restaurant } });
});

export const getRestaurant = asyncWrapper(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantById(req.params.id);
  res.status(200).json({ success: true, data: { restaurant } });
});

export const getMyRestaurant = asyncWrapper(async (req, res) => {
  const restaurant = await restaurantService.getOwnerRestaurant(req.userId);
  res.status(200).json({ success: true, data: { restaurant } });
});

export const listRestaurants = asyncWrapper(async (req, res) => {
  const result = await restaurantService.listRestaurants(req.query);
  res.status(200).json({ success: true, ...result });
});

export const getNearby = asyncWrapper(async (req, res) => {
  const { longitude, latitude, radius } = req.query;
  if (!longitude || !latitude) {
    return res.status(400).json({ success: false, message: 'longitude and latitude are required' });
  }
  const restaurants = await restaurantService.getNearbyRestaurants(longitude, latitude, radius, req.query);
  res.status(200).json({ success: true, data: { restaurants } });
});

export const toggleStatus = asyncWrapper(async (req, res) => {
  const restaurant = await restaurantService.toggleRestaurantStatus(req.params.id, req.userId);
  res.status(200).json({ success: true, message: `Restaurant is now ${restaurant.isOpen ? 'open' : 'closed'}`, data: { restaurant } });
});

export const deleteRestaurant = asyncWrapper(async (req, res) => {
  const result = await restaurantService.deleteRestaurant(req.params.id, req.userId);
  res.status(200).json({ success: true, ...result });
});

// Admin endpoints
export const approveRestaurant = asyncWrapper(async (req, res) => {
  const restaurant = await restaurantService.approveRestaurant(req.params.id, req.body.approved);
  res.status(200).json({ success: true, message: `Restaurant ${req.body.approved ? 'approved' : 'rejected'}`, data: { restaurant } });
});

export const listAllRestaurants = asyncWrapper(async (req, res) => {
  const result = await restaurantService.listAllRestaurants(req.query);
  res.status(200).json({ success: true, ...result });
});
