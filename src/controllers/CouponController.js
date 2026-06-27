const couponService = require('../services/CouponService');

class CouponController {
  async getAllCoupons(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 0;
      const size = parseInt(req.query.size) || 20;
      const coupons = await couponService.getAllCoupons(page, size);
      res.json({ success: true, data: coupons });
    } catch (err) {
      next(err);
    }
  }

  async getCouponById(req, res, next) {
    try {
      const coupon = await couponService.getCouponById(req.params.id);
      res.json({ success: true, data: coupon });
    } catch (err) {
      next(err);
    }
  }

  async createCoupon(req, res, next) {
    try {
      const coupon = await couponService.createCoupon(req.body);
      res.status(201).json({ success: true, data: coupon });
    } catch (err) {
      next(err);
    }
  }

  async updateCoupon(req, res, next) {
    try {
      const coupon = await couponService.updateCoupon(req.params.id, req.body);
      res.json({ success: true, data: coupon });
    } catch (err) {
      next(err);
    }
  }

  async deleteCoupon(req, res, next) {
    try {
      await couponService.deleteCoupon(req.params.id);
      res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CouponController();