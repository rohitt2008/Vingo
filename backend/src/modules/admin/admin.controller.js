import * as adminService from './admin.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

export const getMetrics = asyncWrapper(async (req, res) => {
  const metrics = await adminService.getMetrics();
  res.status(200).json({ success: true, data: { metrics } });
});

export const getUsers = asyncWrapper(async (req, res) => {
  const users = await adminService.getUsers();
  res.status(200).json({ success: true, data: { users } });
});

export const updateUserRole = asyncWrapper(async (req, res) => {
  const { role } = req.body;
  if (!role) return res.status(400).json({ success: false, message: 'role is required' });
  const user = await adminService.updateUserRole(req.params.id, role);
  res.status(200).json({ success: true, message: 'User role updated', data: { user } });
});

export const deleteUser = asyncWrapper(async (req, res) => {
  const result = await adminService.deleteUser(req.params.id);
  res.status(200).json({ success: true, ...result });
});

export const getRestaurants = asyncWrapper(async (req, res) => {
  const restaurants = await adminService.getRestaurants();
  res.status(200).json({ success: true, data: { restaurants } });
});

export const approveRestaurant = asyncWrapper(async (req, res) => {
  const { isActive, approved } = req.body;
  const isApprovedVal = approved !== undefined ? approved : isActive;
  if (isApprovedVal === undefined) {
    return res.status(400).json({ success: false, message: 'isActive or approved is required' });
  }
  const restaurant = await adminService.approveRestaurant(req.params.id, isApprovedVal);
  res.status(200).json({ success: true, message: 'Restaurant state updated', data: { restaurant } });
});
