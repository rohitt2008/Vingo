import Notification from './notification.model.js';

export const createNotification = async (userId, title, message, type = 'system') => {
  return await Notification.create({ userId, title, message, type });
};

export const getNotifications = async (userId) => {
  return await Notification.find({ userId }).sort({ createdAt: -1 }).limit(55);
};

export const markAsRead = async (id, userId) => {
  return await Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
};

export const markAllAsRead = async (userId) => {
  return await Notification.updateMany({ userId, isRead: false }, { isRead: true });
};
