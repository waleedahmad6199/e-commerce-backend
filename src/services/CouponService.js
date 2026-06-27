const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const PagedResponse = require('../utils/PagedResponse');

class CouponService {
  async getAllCoupons(page = 0, size = 20) {
    const totalElements = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalElements / size);
    
    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .skip(page * size)
      .limit(size);
      
    const mappedCoupons = coupons.map(c => ({
      id: c._id.toString(),
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount,
      usageLimit: c.usageLimit,
      usageLimitPerUser: c.usageLimitPerUser,
      usedCount: c.usedCount,
      isActive: c.isActive,
      expiresAt: c.expiresAt
    }));

    return PagedResponse.from(
      mappedCoupons,
      totalElements,
      page,
      size
    );
  }

  async createCoupon(data) {
    const existing = await Coupon.findOne({ code: data.code.toUpperCase() });
    if (existing) throw new ApiError(400, 'Coupon code already exists');

    const coupon = new Coupon({
      ...data,
      code: data.code.toUpperCase()
    });
    
    await coupon.save();
    return this.getCouponById(coupon._id);
  }

  async getCouponById(id) {
    const coupon = await Coupon.findById(id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    return coupon;
  }

  async getCouponByCode(code) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) throw new ApiError(404, 'Invalid coupon code');
    return coupon;
  }

  async updateCoupon(id, data) {
    const coupon = await Coupon.findById(id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');

    if (data.code) {
      const existing = await Coupon.findOne({ code: data.code.toUpperCase() });
      if (existing && existing._id.toString() !== id) {
        throw new ApiError(400, 'Coupon code already exists');
      }
      data.code = data.code.toUpperCase();
    }

    Object.assign(coupon, data);
    await coupon.save();
    return this.getCouponById(id);
  }

  async deleteCoupon(id) {
    const coupon = await Coupon.findById(id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    await Coupon.findByIdAndDelete(id);
    return true;
  }
}

module.exports = new CouponService();