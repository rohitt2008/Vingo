import redisClient from '../../config/redis.js';
import logger from '../../utils/logger.js';

const CART_PREFIX = 'vingo:cart:';
const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get a user's shopping cart.
 *
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} Cart data containing restaurantId and items list
 */
export const getCart = async (userId) => {
  try {
    const data = await redisClient.get(`${CART_PREFIX}${userId}`);
    if (!data) {
      return { restaurantId: null, items: [] };
    }
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Failed to get cart for user ${userId}: ${error.message}`);
    return { restaurantId: null, items: [] };
  }
};

/**
 * Save a user's shopping cart.
 *
 * @param {string} userId - ID of the user
 * @param {Object} cart - Cart object containing restaurantId and items list
 */
export const saveCart = async (userId, cart) => {
  try {
    await redisClient.set(
      `${CART_PREFIX}${userId}`,
      JSON.stringify(cart),
      'EX',
      CART_TTL
    );
  } catch (error) {
    logger.error(`Failed to save cart for user ${userId}: ${error.message}`);
  }
};

/**
 * Add or update an item in the user's cart.
 * If the item is from a different restaurant, it replaces the cart.
 *
 * @param {string} userId - ID of the user
 * @param {string} restaurantId - ID of the restaurant
 * @param {Object} newItem - Item to add
 * @returns {Promise<Object>} Updated cart
 */
export const addToCart = async (userId, restaurantId, newItem) => {
  const cart = await getCart(userId);

  // If adding from a new restaurant, clear existing cart items
  if (cart.restaurantId && cart.restaurantId.toString() !== restaurantId.toString()) {
    cart.items = [];
  }

  cart.restaurantId = restaurantId;

  // Check if item with identical customizations already exists
  const existingIndex = cart.items.findIndex((item) => {
    const isSameId = item.itemId.toString() === newItem.itemId.toString();
    const isSameSpice = item.spiceLevel === newItem.spiceLevel;
    const isSameVariant = item.variant?.name === newItem.variant?.name;
    const isSameExtras = 
      item.extras?.length === newItem.extras?.length &&
      (item.extras || []).every(e => (newItem.extras || []).some(ne => ne.name === e.name));

    return isSameId && isSameSpice && isSameVariant && isSameExtras;
  });

  if (existingIndex > -1) {
    // Increment quantity
    cart.items[existingIndex].quantity += newItem.quantity || 1;
  } else {
    // Push new customized item
    cart.items.push({
      itemId: newItem.itemId,
      name: newItem.name,
      quantity: newItem.quantity || 1,
      price: newItem.price,
      spiceLevel: newItem.spiceLevel,
      variant: newItem.variant,
      extras: newItem.extras || [],
    });
  }

  await saveCart(userId, cart);
  return cart;
};

/**
 * Remove or decrement an item from the user's cart.
 *
 * @param {string} userId - ID of the user
 * @param {Object} matchDetails - Details to match the item to remove (itemId, spiceLevel, variant, etc.)
 * @returns {Promise<Object>} Updated cart
 */
export const removeFromCart = async (userId, matchDetails) => {
  const cart = await getCart(userId);

  const index = cart.items.findIndex((item) => {
    const isSameId = item.itemId.toString() === matchDetails.itemId.toString();
    const isSameSpice = item.spiceLevel === matchDetails.spiceLevel;
    const isSameVariant = item.variant?.name === matchDetails.variant?.name;
    const isSameExtras = 
      item.extras?.length === matchDetails.extras?.length &&
      (item.extras || []).every(e => (matchDetails.extras || []).some(ne => ne.name === e.name));

    return isSameId && isSameSpice && isSameVariant && isSameExtras;
  });

  if (index > -1) {
    if (cart.items[index].quantity > 1 && !matchDetails.forceRemove) {
      cart.items[index].quantity -= 1;
    } else {
      cart.items.splice(index, 1);
    }
  }

  if (cart.items.length === 0) {
    cart.restaurantId = null;
  }

  await saveCart(userId, cart);
  return cart;
};

/**
 * Clear a user's shopping cart completely.
 *
 * @param {string} userId - ID of the user
 */
export const clearCart = async (userId) => {
  try {
    await redisClient.del(`${CART_PREFIX}${userId}`);
  } catch (error) {
    logger.error(`Failed to clear cart for user ${userId}: ${error.message}`);
  }
};
