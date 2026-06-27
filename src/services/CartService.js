/**
 * FILE: src/services/CartService.js
 * ----------------------------------
 * PURPOSE:
 *   Business logic for shopping cart operations.
 *   The cart is a single MongoDB document per user with embedded items.
 *   CartService creates the cart document on first access, and all operations
 *   (add, update, remove, clear) read-modify-write that single document.
 *
 * KEY DESIGN:
 *   - getCart() creates a new empty cart if one doesn't exist yet (lazy init).
 *   - addItem() increments quantity if the same product+variant already exists.
 *   - updateItem() removes the item entirely if quantity drops to 0 or below.
 *   - All items carry a priceAtTime snapshot so cart totals stay consistent
 *     even if the product's price changes before checkout.
 *   - _toDTO() computes lineTotal and subtotal on the fly from stored prices.
 *
 * DEPENDENCIES:
 *   - models/Cart.js
 *   - utils/ApiError.js
 *   - utils/helpers.js (computeCartTotals, generateUUID)
 *
 * USED BY:
 *   - src/controllers/OrderController.js
 */

const Cart     = require('../models/Cart');                              // Cart Mongoose model
const ApiError = require('../utils/ApiError');                           // Custom error class
const { computeCartTotals, generateUUID } = require('../utils/helpers'); // Utility functions

class CartService {

  /**
   * getCart()
   * Retrieves the cart for a user. Creates an empty cart if none exists yet.
   *
   * @param {string} userId - MongoDB ObjectId string from the JWT
   * @returns {object} Cart DTO with items, subtotal, and itemCount
   */
  async getCart(userId) {
    let cart = await Cart.findOne({ userId }); // Try to find the existing cart
    if (!cart) {
      cart = await Cart.create({ userId, items: [] }); // Lazy-create an empty cart on first access
    } else {
      let modified = false;
      cart.items.forEach(item => {
        if (!item.id) {
          item.id = generateUUID();
          modified = true;
        }
      });
      if (modified) await cart.save();
    }
    return this._toDTO(cart); // Return the formatted cart DTO
  }

  /**
   * addItem()
   * Adds a product (with optional variant) to the cart.
   * If the same product+variant already exists, increments its quantity instead.
   *
   * @param {string} userId  - MongoDB ObjectId string from the JWT
   * @param {object} itemData - { productId, variantId, quantity, priceAtTime, productTitle, productImage }
   * @returns {object} Updated cart DTO
   */
  async addItem(userId, { productId, variantId, quantity, priceAtTime, productTitle, productImage }) {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] }); // Create cart if not exists
    }

    // Check if this exact product+variant combination already exists in the cart
    const existingItem = cart.items.find(
      i => i.productId === productId &&
      (variantId ? i.variantId === variantId : !i.variantId) // Match variant exactly
    );

    if (existingItem) {
      existingItem.quantity += quantity; // Increment quantity of existing item
    } else {
      // Push a new cart item with all required snapshot data
      cart.items.push({
        id:           generateUUID(), // Stable client-side identifier
        productId,
        variantId:    variantId || null,
        quantity,
        priceAtTime,  // Snapshot of price at add-to-cart time
        productTitle,
        productImage,
        variantSku:   null,
        variantAttrs: null,
      });
    }

    await cart.save(); // Persist the modified cart
    return this._toDTO(cart);
  }

  /**
   * updateItem()
   * Sets the quantity of a cart item. Removes the item if quantity <= 0.
   *
   * @param {string} userId   - MongoDB ObjectId string from the JWT
   * @param {string} itemId   - The cart item's _id or id string
   * @param {number} quantity - New quantity value
   * @returns {object} Updated cart DTO
   */
  async updateItem(userId, itemId, quantity) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new ApiError(404, 'Cart not found');

    // Find item by our custom UUID id field
    const item = cart.items.find(i => i.id === itemId);
    if (!item) throw new ApiError(404, 'Cart item not found');

    if (quantity <= 0) {
      // Remove item entirely when quantity drops to zero
      cart.items = cart.items.filter(i => i.id !== itemId);
    } else {
      item.quantity = quantity; // Update the quantity
    }

    await cart.save();
    return this._toDTO(cart);
  }

  /**
   * removeItem()
   * Removes a specific item from the cart by its ID.
   *
   * @param {string} userId  - MongoDB ObjectId string from the JWT
   * @param {string} itemId  - The cart item's _id or id string
   * @returns {object} Updated cart DTO
   */
  async removeItem(userId, itemId) {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new ApiError(404, 'Cart not found');

    const beforeLength = cart.items.length;
    // Filter out the item with the matching id
    cart.items = cart.items.filter(i => i.id !== itemId);

    if (cart.items.length === beforeLength) {
      throw new ApiError(404, 'Cart item not found'); // Nothing was removed
    }

    await cart.save();
    return this._toDTO(cart);
  }

  /**
   * clearCart()
   * Removes all items from the cart. Called after successful checkout.
   *
   * @param {string} userId - MongoDB ObjectId string from the JWT
   */
  async clearCart(userId) {
    const cart = await Cart.findOne({ userId });
    if (cart) {
      cart.items = []; // Empty the items array
      await cart.save();
    }
  }

  /**
   * _toDTO()
   * Transforms a raw Cart document into a clean data transfer object.
   * Computes lineTotal per item and overall subtotal and itemCount.
   *
   * @param {object} cart - Mongoose Cart document
   * @returns {object} Formatted cart with computed totals
   */
  _toDTO(cart) {
    // Map each raw item to a DTO with computed lineTotal
    const items = cart.items.map(item => ({
      id:           item.id || generateUUID(),        // UUID string for stable React key
      productId:    item.productId,
      variantId:    item.variantId,
      quantity:     item.quantity,
      priceAtTime:  item.priceAtTime,
      lineTotal:    (item.priceAtTime || 0) * (item.quantity || 0), // Computed line total
      productTitle: item.productTitle,
      productImage: item.productImage,
      variantSku:   item.variantSku,
      variantAttrs: item.variantAttrs,
    }));

    // Compute subtotal and total item count from the mapped items
    const { subtotal, itemCount } = computeCartTotals(items);

    return {
      id:        cart._id,
      userId:    cart.userId,
      items,
      subtotal,
      itemCount,
      updatedAt: cart.updatedAt,
    };
  }
}

module.exports = new CartService(); // Export singleton instance
