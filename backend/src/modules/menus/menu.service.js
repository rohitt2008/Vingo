import Menu from './menu.model.js';
import Restaurant from '../restaurants/restaurant.model.js';
import { AppError } from '../../middleware/errorHandler.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';
import logger from '../../utils/logger.js';

// ── Get Menu by Restaurant ────────────────────────────────────────────

export const getMenuByRestaurant = async (restaurantId) => {
  let menu = await Menu.findOne({ restaurantId, isPublished: true });
  if (!menu) {
    // Create an empty menu if none exists
    menu = await Menu.create({
      restaurantId,
      categories: [],
      isPublished: true,
      publishedAt: new Date(),
    });
  }
  return menu;
};

// ── Add Category ──────────────────────────────────────────────────────

export const addCategory = async (restaurantId, ownerId, categoryData) => {
  await verifyOwnership(restaurantId, ownerId);

  const menu = await getOrCreateMenu(restaurantId);

  menu.categories.push({
    name: categoryData.name,
    sortOrder: categoryData.sortOrder || menu.categories.length,
    items: [],
  });

  await menu.save();
  return menu;
};

// ── Update Category ───────────────────────────────────────────────────

export const updateCategory = async (restaurantId, ownerId, categoryId, data) => {
  await verifyOwnership(restaurantId, ownerId);

  const menu = await getOrCreateMenu(restaurantId);
  const category = menu.categories.id(categoryId);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  if (data.name) category.name = data.name;
  if (data.sortOrder !== undefined) category.sortOrder = data.sortOrder;

  await menu.save();
  return menu;
};

// ── Delete Category ───────────────────────────────────────────────────

export const deleteCategory = async (restaurantId, ownerId, categoryId) => {
  await verifyOwnership(restaurantId, ownerId);

  const menu = await getOrCreateMenu(restaurantId);
  const category = menu.categories.id(categoryId);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  category.deleteOne();
  await menu.save();
  return menu;
};

// ── Add Item to Category ──────────────────────────────────────────────

export const addItem = async (restaurantId, ownerId, categoryId, itemData, imageFile) => {
  await verifyOwnership(restaurantId, ownerId);

  const menu = await getOrCreateMenu(restaurantId);
  const category = menu.categories.id(categoryId);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  let image;
  if (imageFile) {
    image = await uploadToCloudinary(imageFile.path, 'menu-items');
  }

  const item = {
    name: itemData.name,
    description: itemData.description,
    price: Number(itemData.price),
    foodType: itemData.foodType,
    category: category.name,
    image,
    variants: itemData.variants ? JSON.parse(itemData.variants) : [],
    extras: itemData.extras ? JSON.parse(itemData.extras) : [],
    spiceLevels: itemData.spiceLevels ? JSON.parse(itemData.spiceLevels) : ['mild', 'medium', 'hot'],
    isAvailable: itemData.isAvailable !== 'false',
    availableFrom: itemData.availableFrom,
    availableTo: itemData.availableTo,
    sortOrder: itemData.sortOrder || category.items.length,
  };

  category.items.push(item);
  await menu.save();

  logger.info(`Item added: ${item.name} to category ${category.name}`);
  return menu;
};

// ── Update Item ───────────────────────────────────────────────────────

export const updateItem = async (restaurantId, ownerId, categoryId, itemId, itemData, imageFile) => {
  await verifyOwnership(restaurantId, ownerId);

  const menu = await getOrCreateMenu(restaurantId);
  const category = menu.categories.id(categoryId);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const item = category.items.id(itemId);
  if (!item) {
    throw new AppError('Item not found', 404);
  }

  // Update fields
  const updateFields = ['name', 'description', 'price', 'foodType', 'isAvailable',
    'availableFrom', 'availableTo', 'sortOrder'];
  for (const field of updateFields) {
    if (itemData[field] !== undefined) {
      item[field] = field === 'price' ? Number(itemData[field]) : itemData[field];
    }
  }

  if (itemData.variants) item.variants = JSON.parse(itemData.variants);
  if (itemData.extras) item.extras = JSON.parse(itemData.extras);
  if (itemData.spiceLevels) item.spiceLevels = JSON.parse(itemData.spiceLevels);

  if (imageFile) {
    item.image = await uploadToCloudinary(imageFile.path, 'menu-items');
  }

  await menu.save();
  return menu;
};

// ── Delete Item ───────────────────────────────────────────────────────

export const deleteItem = async (restaurantId, ownerId, categoryId, itemId) => {
  await verifyOwnership(restaurantId, ownerId);

  const menu = await getOrCreateMenu(restaurantId);
  const category = menu.categories.id(categoryId);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const item = category.items.id(itemId);
  if (!item) {
    throw new AppError('Item not found', 404);
  }

  item.deleteOne();
  await menu.save();
  return menu;
};

// ── Toggle Item Availability ──────────────────────────────────────────

export const toggleItemAvailability = async (restaurantId, ownerId, categoryId, itemId) => {
  await verifyOwnership(restaurantId, ownerId);

  const menu = await getOrCreateMenu(restaurantId);
  const category = menu.categories.id(categoryId);
  if (!category) throw new AppError('Category not found', 404);

  const item = category.items.id(itemId);
  if (!item) throw new AppError('Item not found', 404);

  item.isAvailable = !item.isAvailable;
  await menu.save();
  return menu;
};

// ── Helpers ───────────────────────────────────────────────────────────

async function verifyOwnership(restaurantId, ownerId) {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId, isDeleted: false });
  if (!restaurant) {
    throw new AppError('Restaurant not found or you are not the owner', 403);
  }
  return restaurant;
}

async function getOrCreateMenu(restaurantId) {
  let menu = await Menu.findOne({ restaurantId });
  if (!menu) {
    menu = await Menu.create({
      restaurantId,
      categories: [],
      isPublished: true,
      publishedAt: new Date(),
    });
  }
  return menu;
}
