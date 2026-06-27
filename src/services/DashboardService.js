/**
 * FILE: src/services/DashboardService.js
 * ----------------------------------------
 * PURPOSE:
 *   Aggregates statistics for the admin dashboard in a single parallel query batch.
 *   Returns revenue totals, order counts, product inventory summary, customer counts,
 *   6-month trend data, recent orders, top-selling products, low-stock alerts,
 *   and pending refund/return counts.
 *
 * PERFORMANCE:
 *   All 18 queries run concurrently via Promise.all() to minimise response time.
 *   MongoDB aggregation pipelines are used for revenue and trend calculations.
 *
 * GROWTH CALCULATION:
 *   revenueGrowth / orderGrowth / customerGrowth compare the current cumulative
 *   total against the value 30 days ago to produce a % change figure.
 *
 * USED BY:
 *   - src/controllers/AdminController.js (getDashboard)
 */
const Product = require('../models/Product'); // Product counts and top-sellers
const Order   = require('../models/Order');   // Order counts, revenue aggregation
const User    = require('../models/User');     // Customer counts
const Refund  = require('../models/Refund');  // Pending refund count
const Return  = require('../models/Return');  // Pending return count

class DashboardService {
  async getDashboardStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      revenueResult,
      prevRevenueResult,
      totalOrders,
      prevTotalOrders,
      monthlyRevenue,
      monthlyOrders,
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalCustomers,
      prevCustomers,
      newCustomers,
      recentOrders,
      topProducts,
      lowStockList,
      pendingRefunds,
      pendingReturns,
    ] = await Promise.all([
      // Current period revenue
      Order.aggregate([
        { $match: { status: 'DELIVERED' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      // Previous period revenue
      Order.aggregate([
        { $match: { status: 'DELIVERED', createdAt: { $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      // Total orders
      Order.countDocuments(),
      // Previous period orders
      Order.countDocuments({ createdAt: { $lt: thirtyDaysAgo } }),
      // Monthly revenue trend (last 6 months)
      Order.aggregate([
        { $match: { status: 'DELIVERED' } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$grandTotal' },
        }},
        { $sort: { _id: 1 } },
        { $limit: 6 },
      ]),
      // Monthly orders trend (last 6 months)
      Order.aggregate([
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
        { $limit: 6 },
      ]),
      Product.countDocuments(),
      Product.countDocuments({ status: 'ACTIVE' }),
      Product.countDocuments({
        $expr: { $lt: ['$inventory.available', '$inventory.lowStockThreshold'] },
      }),
      Product.countDocuments({ 'inventory.available': { $lte: 0 } }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $lt: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
      Product.find({ status: 'ACTIVE' }).sort({ soldCount: -1 }).limit(5).lean(),
      Product.find({
        $expr: { $lt: ['$inventory.available', '$inventory.lowStockThreshold'] },
      }).limit(10).lean(),
      Refund.countDocuments({ status: 'PENDING' }),
      Return.countDocuments({ status: 'REQUESTED' }),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    const prevRevenue = prevRevenueResult.length > 0 ? prevRevenueResult[0].total : 0;
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const orderGrowth = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
    const prevCustomerCount = prevCustomers;
    const customerGrowth = prevCustomerCount > 0 ? ((totalCustomers - prevCustomerCount) / prevCustomerCount) * 100 : 0;

    // Build trend arrays padded to 6 entries
    const fillTrend = (data, valueKey, defaultVal = 0) => {
      const map = {};
      for (const entry of data) map[entry._id] = entry[valueKey];
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        result.push(map[key] ?? defaultVal);
      }
      return result;
    };

    return {
      revenue: {
        totalRevenue,
        revenueGrowth,
        trend: fillTrend(monthlyRevenue, 'total'),
      },
      orders: {
        totalOrders,
        orderGrowth,
        trend: fillTrend(monthlyOrders, 'count'),
      },
      products: {
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
      },
      customers: {
        totalCustomers,
        newCustomers,
        customerGrowth,
      },
      recentOrders: recentOrders.map(o => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        customerName: o.userEmail || '',
        total: o.grandTotal,
        status: o.status,
        createdAt: o.createdAt,
      })),
      topProducts: topProducts.map(p => ({
        _id: p._id,
        title: p.title,
        soldCount: p.soldCount,
        revenue: (p.soldCount || 0) * (p.basePrice || 0),
      })),
      lowStockProducts: lowStockList.map(p => ({
        _id: p._id,
        title: p.title,
        available: p.inventory.available,
        lowStockThreshold: p.inventory.lowStockThreshold,
      })),
      pendingRefunds,
      pendingReturns,
    };
  }
}

module.exports = new DashboardService();
