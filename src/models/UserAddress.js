/**
 * FILE: src/models/UserAddress.js
 * --------------------------------
 * PURPOSE:
 *   Mongoose schema for the `useraddresses` collection.
 *   Stores saved delivery addresses for customer accounts.
 *   A user can have multiple addresses; exactly one can be marked isDefault.
 *
 * DESIGN NOTE:
 *   Addresses are stored as a separate collection (not embedded in User) because:
 *   - Users can have many addresses, and the list changes independently.
 *   - Addresses are also referenced by the order checkout flow (copyied as snapshot).
 *   UserService.setDefaultAddress() unsets isDefault on all other addresses first,
 *   then sets isDefault=true on the target — ensuring exactly one default at all times.
 *
 * USED BY:
 *   - src/services/UserService.js (getAddresses, addAddress, updateAddress, etc.)
 *   - src/controllers/UserController.js
 */

const mongoose = require('mongoose');

const userAddressSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId, // Reference to User document
    ref:      'User',
    required: true,
    index:    true, // Indexed for fast user address lookup
  },

  label:    String,                          // User-defined label (e.g. "Home", "Office")
  fullName: { type: String, required: true }, // Recipient full name for delivery label

  phone:     String,                          // Recipient phone for delivery contact
  street:    { type: String, required: true }, // Street address line 1
  apartment: String,                          // Apartment / suite / unit (line 2)
  city:      { type: String, required: true }, // City
  state:     String,                          // State / province / region
  zipCode:   String,                          // Postal / ZIP code
  country:   { type: String, default: 'US' }, // ISO 3166-1 alpha-2 country code

  isDefault: { type: Boolean, default: false }, // True for the user's primary address
}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────────────────
userAddressSchema.index({ userId: 1, isDefault: 1 }); // Fast default address lookup

module.exports = mongoose.model('UserAddress', userAddressSchema);
