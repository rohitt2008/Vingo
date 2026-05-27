import * as notificationService from './notification.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

export const getNotifications = asyncWrapper(async (req, res) => {
  const notifications = await notificationService.getNotifications(req.userId);
  res.status(200).json({ success: true, data: { notifications } });
});

export const markAsRead = asyncWrapper(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.userId);
  res.status(200).json({ success: true, message: 'Notification marked as read', data: { notification } });
});

export const markAllAsRead = asyncWrapper(async (req, res) => {
  await notificationService.markAllAsRead(req.userId);
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});
