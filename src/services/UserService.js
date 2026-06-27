/**
 * FILE: src/services/UserService.js
 * -----------------------------------
 * PURPOSE:
 *   Business logic for customer profile management, saved addresses,
 *   saved payment methods, and wishlist operations.
 *   All operations verify ownership (address/payment userId must match caller)
 *   to prevent IDOR vulnerabilities.
 *
 * OWNERSHIP ENFORCEMENT:
 *   - setDefaultAddress / updateAddress / deleteAddress all verify that the
 *     address.userId matches the supplied userId parameter before mutating.
 *   - setDefaultPaymentMethod / deletePaymentMethod do the same.
 *   - The "single default" invariant is maintained by calling updateMany to
 *     clear all isDefault flags before setting the new default.
 *
 * DEPENDENCIES:
 *   - models/User.js
 *   - models/UserAddress.js
 *   - models/UserPaymentMethod.js
 *   - models/UserWishlist.js
 *   - bcryptjs           (password hashing for changePassword)
 *   - utils/ApiError.js
 *   - utils/PagedResponse.js
 *
 * USED BY:
 *   - src/controllers/UserController.js
 */
const User               = require('../models/User');                // Customer accounts
const UserAddress        = require('../models/UserAddress');         // Saved addresses
const UserPaymentMethod  = require('../models/UserPaymentMethod');   // Saved payment methods
const UserWishlist       = require('../models/UserWishlist');        // Wishlist items
const bcrypt             = require('bcryptjs');                      // Password hashing
const ApiError           = require('../utils/ApiError');             // Custom error class
const PagedResponse      = require('../utils/PagedResponse');        // Pagination envelope

class UserService {
  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  async getAllUsers(page, size, sortStr) {
    const skip = page * size;
    let sortObj = { createdAt: -1 };
    if (sortStr) {
      if (sortStr === 'firstName_asc') sortObj = { firstName: 1 };
      else if (sortStr === 'firstName_desc') sortObj = { firstName: -1 };
      else if (sortStr === 'lastName_asc') sortObj = { lastName: 1 };
      else if (sortStr === 'lastName_desc') sortObj = { lastName: -1 };
      else if (sortStr.startsWith('-')) sortObj = { [sortStr.substring(1)]: -1 };
      else sortObj = { [sortStr]: 1 };
    }
    const [users, total] = await Promise.all([
      User.find().sort(sortObj).skip(skip).limit(size),
      User.countDocuments(),
    ]);
    return PagedResponse.from(users, total, page, size);
  }

  async updateUser(id, data) {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;

    await user.save();
    return user;
  }

  async blockUser(id, isBlocked) {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');
    user.isActive = !isBlocked;
    await user.save();
    return user;
  }

  async deleteUser(id) {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');
    await User.deleteOne({ _id: id });
  }

  async changePassword(id, { currentPassword, newPassword }) {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
  }

  async getAddresses(userId) {
    return UserAddress.find({ userId }).sort({ createdAt: -1 });
  }

  async addAddress(userId, data) {
    if (data.isDefault) {
      await UserAddress.updateMany({ userId }, { isDefault: false });
    }

    const address = await UserAddress.create({
      userId,
      label: data.label,
      fullName: data.fullName,
      phone: data.phone,
      street: data.street,
      apartment: data.apartment,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country || 'US',
      isDefault: data.isDefault || false,
    });

    return address;
  }

  async updateAddress(userId, addressId, data) {
    const address = await UserAddress.findById(addressId);
    if (!address) throw new ApiError(404, 'Address not found');
    if (address.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Address does not belong to this user');
    }

    if (data.isDefault && !address.isDefault) {
      await UserAddress.updateMany({ userId }, { isDefault: false });
    }

    if (data.label !== undefined) address.label = data.label;
    if (data.fullName !== undefined) address.fullName = data.fullName;
    if (data.phone !== undefined) address.phone = data.phone;
    if (data.street !== undefined) address.street = data.street;
    if (data.apartment !== undefined) address.apartment = data.apartment;
    if (data.city !== undefined) address.city = data.city;
    if (data.state !== undefined) address.state = data.state;
    if (data.zipCode !== undefined) address.zipCode = data.zipCode;
    if (data.country !== undefined) address.country = data.country;
    address.isDefault = data.isDefault || false;

    await address.save();
    return address;
  }

  async deleteAddress(userId, addressId) {
    const address = await UserAddress.findById(addressId);
    if (!address) throw new ApiError(404, 'Address not found');
    if (address.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Address does not belong to this user');
    }
    await UserAddress.deleteOne({ _id: addressId });
  }

  async setDefaultAddress(userId, addressId) {
    await UserAddress.updateMany({ userId }, { isDefault: false });
    const address = await UserAddress.findById(addressId);
    if (!address) throw new ApiError(404, 'Address not found');
    if (address.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Address does not belong to this user');
    }
    address.isDefault = true;
    await address.save();
  }

  async getPaymentMethods(userId) {
    return UserPaymentMethod.find({ userId }).sort({ createdAt: -1 });
  }

  async addPaymentMethod(userId, data) {
    if (data.isDefault) {
      await UserPaymentMethod.updateMany({ userId }, { isDefault: false });
    }

    const method = await UserPaymentMethod.create({
      userId,
      type: data.type,
      provider: data.provider,
      lastFourDigits: data.lastFourDigits,
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      cardholderName: data.cardholderName,
      isDefault: data.isDefault || false,
    });

    return method;
  }

  async deletePaymentMethod(userId, methodId) {
    const method = await UserPaymentMethod.findById(methodId);
    if (!method) throw new ApiError(404, 'Payment method not found');
    if (method.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Payment method does not belong to this user');
    }
    await UserPaymentMethod.deleteOne({ _id: methodId });
  }

  async setDefaultPaymentMethod(userId, methodId) {
    await UserPaymentMethod.updateMany({ userId }, { isDefault: false });
    const method = await UserPaymentMethod.findById(methodId);
    if (!method) throw new ApiError(404, 'Payment method not found');
    if (method.userId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Payment method does not belong to this user');
    }
    method.isDefault = true;
    await method.save();
  }

  async getWishlistProductIds(userId) {
    const items = await UserWishlist.find({ userId }).sort({ addedAt: -1 });
    return items.map(item => item.productId);
  }

  async addProductToWishlist(userId, productId) {
    const exists = await UserWishlist.findOne({ userId, productId });
    if (!exists) {
      await UserWishlist.create({ userId, productId });
    }
  }

  async removeProductFromWishlist(userId, productId) {
    await UserWishlist.deleteOne({ userId, productId });
  }
}

module.exports = new UserService();
