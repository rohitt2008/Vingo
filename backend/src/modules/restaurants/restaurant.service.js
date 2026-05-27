import Restaurant from './restaurant.model.js';
import Menu from '../menus/menu.model.js';
import { AppError } from '../../middleware/errorHandler.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';
import logger from '../../utils/logger.js';
import env from '../../config/env.js';

const parseCuisines = (cuisines) => {
  if (!cuisines) return [];
  if (typeof cuisines === 'string') {
    try {
      const parsed = JSON.parse(cuisines);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return cuisines.split(',').map(c => c.trim()).filter(Boolean);
    }
  }
  return cuisines;
};

// ── Create Restaurant ─────────────────────────────────────────────────

export const createRestaurant = async (ownerId, data, imageFile) => {
  // Check if owner already has a restaurant
  const existing = await Restaurant.findOne({ ownerId, isDeleted: false });
  if (existing) {
    throw new AppError('You already have a restaurant. Use update instead.', 409);
  }

  let coverImage;
  if (imageFile) {
    coverImage = await uploadToCloudinary(imageFile.path, 'restaurants');
  }

  const restaurant = await Restaurant.create({
    ownerId,
    name: data.name,
    description: data.description,
    cuisines: parseCuisines(data.cuisines),
    location: {
      type: 'Point',
      coordinates: [
        parseFloat(data.longitude) || 0,
        parseFloat(data.latitude) || 0,
      ],
    },
    address: {
      street: data.street,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      landmark: data.landmark,
    },
    coverImage,
    phone: data.phone,
    email: data.email,
    priceForTwo: data.priceForTwo ? Number(data.priceForTwo) : 40000,
    fssaiLicense: data.fssaiLicense,
    isApproved: env.NODE_ENV === 'development' ? true : false,
  });

  // Create an empty menu for the restaurant
  await Menu.create({
    restaurantId: restaurant._id,
    categories: [],
    isPublished: true,
    publishedAt: new Date(),
  });

  logger.info(`Restaurant created: ${restaurant.name} by owner ${ownerId}`);
  return restaurant;
};

// ── Update Restaurant ─────────────────────────────────────────────────

export const updateRestaurant = async (restaurantId, ownerId, data, imageFile) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId, isDeleted: false });
  if (!restaurant) {
    throw new AppError('Restaurant not found or you are not the owner', 404);
  }

  // Update fields
  const allowedFields = ['name', 'description', 'cuisines', 'phone', 'email',
    'priceForTwo', 'fssaiLicense', 'avgDeliveryMin', 'deliveryRadius', 'minOrderAmount'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'cuisines') {
        restaurant.cuisines = parseCuisines(data.cuisines);
      } else {
        restaurant[field] = data[field];
      }
    }
  }

  // Update address
  if (data.street || data.city || data.state || data.pincode) {
    restaurant.address = {
      street: data.street || restaurant.address.street,
      city: data.city || restaurant.address.city,
      state: data.state || restaurant.address.state,
      pincode: data.pincode || restaurant.address.pincode,
      landmark: data.landmark || restaurant.address.landmark,
    };
  }

  // Update location
  if (data.longitude && data.latitude) {
    restaurant.location = {
      type: 'Point',
      coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
    };
  }

  // Update cover image
  if (imageFile) {
    restaurant.coverImage = await uploadToCloudinary(imageFile.path, 'restaurants');
  }

  // Update opening hours
  if (data.openingHours) {
    restaurant.openingHours = data.openingHours;
  }

  await restaurant.save();
  return restaurant;
};

// ── Get Restaurant by ID ──────────────────────────────────────────────

export const getRestaurantById = async (restaurantId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, isDeleted: false })
    .populate('ownerId', 'name email phone');
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }
  return restaurant;
};

// ── Get Owner's Restaurant ────────────────────────────────────────────

export const getOwnerRestaurant = async (ownerId) => {
  const restaurant = await Restaurant.findOne({ ownerId, isDeleted: false });
  return restaurant; // Can be null if no restaurant yet
};

// ── List Restaurants (with filters) ───────────────────────────────────

export const listRestaurants = async (filters = {}) => {
  const query = { isDeleted: false, isApproved: true };

  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Cuisine filter
  if (filters.cuisine) {
    query.cuisines = { $in: Array.isArray(filters.cuisine) ? filters.cuisine : [filters.cuisine] };
  }

  // Rating filter
  if (filters.minRating) {
    query.avgRating = { $gte: Number(filters.minRating) };
  }

  // Price band filter
  if (filters.maxPriceForTwo) {
    query.priceForTwo = { $lte: Number(filters.maxPriceForTwo) };
  }

  // Food type filter (veg only)
  if (filters.vegOnly === 'true') {
    // This will be filtered at menu level, for now just pass through
  }

  // Open now filter
  if (filters.openNow === 'true') {
    query.isOpen = true;
  }

  // City filter
  if (filters.city) {
    query['address.city'] = { $regex: new RegExp(filters.city, 'i') };
  }

  // Sort
  let sort = {};
  switch (filters.sortBy) {
    case 'rating':
      sort = { avgRating: -1 };
      break;
    case 'deliveryTime':
      sort = { avgDeliveryMin: 1 };
      break;
    case 'priceAsc':
      sort = { priceForTwo: 1 };
      break;
    case 'priceDesc':
      sort = { priceForTwo: -1 };
      break;
    case 'newest':
      sort = { createdAt: -1 };
      break;
    default:
      sort = { avgRating: -1, totalOrders: -1 };
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [restaurants, totalItems] = await Promise.all([
    Restaurant.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Restaurant.countDocuments(query),
  ]);

  return {
    data: restaurants,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      hasNextPage: page < Math.ceil(totalItems / limit),
      hasPrevPage: page > 1,
    },
  };
};

// ── Nearby Restaurants (Geo Query) ────────────────────────────────────

export const getNearbyRestaurants = async (longitude, latitude, radiusKm = 5, filters = {}) => {
  const query = {
    isDeleted: false,
    isApproved: true,
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: radiusKm * 1000, // Convert km to meters
      },
    },
  };

  if (filters.openNow === 'true') {
    query.isOpen = true;
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const restaurants = await Restaurant.find(query)
    .skip(skip)
    .limit(limit)
    .lean();

  return restaurants;
};

// ── Toggle Restaurant Open/Close ──────────────────────────────────────

export const toggleRestaurantStatus = async (restaurantId, ownerId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId, isDeleted: false });
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  restaurant.isOpen = !restaurant.isOpen;
  await restaurant.save();

  return restaurant;
};

// ── Soft Delete Restaurant ────────────────────────────────────────────

export const deleteRestaurant = async (restaurantId, ownerId) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId, isDeleted: false });
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  restaurant.isDeleted = true;
  restaurant.isOpen = false;
  await restaurant.save();

  return { message: 'Restaurant deleted successfully' };
};

// ── Admin: Approve Restaurant ─────────────────────────────────────────

export const approveRestaurant = async (restaurantId, approved) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  restaurant.isApproved = approved;
  await restaurant.save();

  logger.info(`Restaurant ${restaurantId} ${approved ? 'approved' : 'rejected'} by admin`);
  return restaurant;
};

// ── Admin: List All Restaurants ───────────────────────────────────────

export const listAllRestaurants = async (filters = {}) => {
  const query = { isDeleted: false };

  if (filters.approved !== undefined) {
    query.isApproved = filters.approved === 'true';
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [restaurants, totalItems] = await Promise.all([
    Restaurant.find(query)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Restaurant.countDocuments(query),
  ]);

  return {
    data: restaurants,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
};
