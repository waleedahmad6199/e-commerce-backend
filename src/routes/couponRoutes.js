const express = require('express');
const router = express.Router();

const couponController = require('../controllers/CouponController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

router.get('/', authenticateUser, requireAdmin, couponController.getAllCoupons);
router.post('/', authenticateUser, requireAdmin, couponController.createCoupon);
router.get('/:id', authenticateUser, requireAdmin, couponController.getCouponById);
router.put('/:id', authenticateUser, requireAdmin, couponController.updateCoupon);
router.delete('/:id', authenticateUser, requireAdmin, couponController.deleteCoupon);

module.exports = router;