require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const AdminRole = require('../src/models/AdminRole');
const AdminPermission = require('../src/models/AdminPermission');
const AdminUser = require('../src/models/AdminUser');
const User = require('../src/models/User');
const UserAddress = require('../src/models/UserAddress');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const WebsiteSetting = require('../src/models/WebsiteSetting');
const FeatureFlag = require('../src/models/FeatureFlag');
const CmsPage = require('../src/models/CmsPage');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');
const Shipment = require('../src/models/Shipment');

const SALT_ROUNDS = 10;
const SUPER_ADMIN_ROLE_ID = new mongoose.Types.ObjectId().toString();

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_db';
  console.log(`Connecting to MongoDB at ${uri}...`);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db.dropCollection(col.name);
  }
  console.log('Dropped all existing collections.');

  // ── 1. Admin Permissions ──────────────────────────────────────────────
  console.log('Creating admin permissions...');
  const permissionDefs = [
    // Dashboard
    { code: 'dashboard.view', name: 'View Dashboard', module: 'Dashboard' },
    { code: 'dashboard.export', name: 'Export Reports', module: 'Dashboard' },
    // Products
    { code: 'products.view', name: 'View Products', module: 'Products' },
    { code: 'products.create', name: 'Create Products', module: 'Products' },
    { code: 'products.edit', name: 'Edit Products', module: 'Products' },
    { code: 'products.delete', name: 'Delete Products', module: 'Products' },
    { code: 'products.manage-inventory', name: 'Manage Inventory', module: 'Products' },
    // Categories
    { code: 'categories.view', name: 'View Categories', module: 'Categories' },
    { code: 'categories.create', name: 'Create Categories', module: 'Categories' },
    { code: 'categories.edit', name: 'Edit Categories', module: 'Categories' },
    { code: 'categories.delete', name: 'Delete Categories', module: 'Categories' },
    // Orders
    { code: 'orders.view', name: 'View Orders', module: 'Orders' },
    { code: 'orders.create', name: 'Create Orders', module: 'Orders' },
    { code: 'orders.edit', name: 'Edit Orders', module: 'Orders' },
    { code: 'orders.delete', name: 'Delete Orders', module: 'Orders' },
    { code: 'orders.manage-status', name: 'Manage Order Status', module: 'Orders' },
    { code: 'orders.process-refund', name: 'Process Refunds', module: 'Orders' },
    // Customers
    { code: 'customers.view', name: 'View Customers', module: 'Customers' },
    { code: 'customers.edit', name: 'Edit Customers', module: 'Customers' },
    { code: 'customers.delete', name: 'Delete Customers', module: 'Customers' },
    // Content
    { code: 'content.pages', name: 'Manage Pages', module: 'Content' },
    { code: 'content.banners', name: 'Manage Banners', module: 'Content' },
    { code: 'content.popups', name: 'Manage Popups', module: 'Content' },
    { code: 'content.announcements', name: 'Manage Announcements', module: 'Content' },
    // Marketing
    { code: 'marketing.promotions', name: 'Manage Promotions', module: 'Marketing' },
    { code: 'marketing.coupons', name: 'Manage Coupons', module: 'Marketing' },
    { code: 'marketing.seo', name: 'Manage SEO', module: 'Marketing' },
    // Settings
    { code: 'settings.general', name: 'Manage General Settings', module: 'Settings' },
    { code: 'settings.payment', name: 'Manage Payment Settings', module: 'Settings' },
    { code: 'settings.shipping', name: 'Manage Shipping Settings', module: 'Settings' },
    { code: 'settings.email', name: 'Manage Email Settings', module: 'Settings' },
    // Users & Roles
    { code: 'users.manage', name: 'Manage Users', module: 'Users & Roles' },
    { code: 'roles.manage', name: 'Manage Roles', module: 'Users & Roles' },
    // Reports
    { code: 'reports.view', name: 'View Reports', module: 'Reports' },
    { code: 'reports.export', name: 'Export Reports', module: 'Reports' },
    // Reviews
    { code: 'reviews.moderate', name: 'Moderate Reviews', module: 'Reviews' },
  ];

  const allPermissions = await AdminPermission.insertMany(
    permissionDefs.map((p) => ({ ...p, description: p.name }))
  );
  console.log(`  Created ${allPermissions.length} permissions.`);

  const permMap = {};
  for (const p of allPermissions) {
    permMap[p.code] = p._id.toString();
  }

  // ── 2. Admin Roles ────────────────────────────────────────────────────
  console.log('Creating admin roles...');
  const roleDefs = [
    {
      _id: SUPER_ADMIN_ROLE_ID,
      name: 'SUPER_ADMIN',
      description: 'Full system access with all permissions',
      isSystem: true,
      permissionIds: allPermissions.map((p) => p._id.toString()),
    },
    {
      name: 'ADMIN',
      description: 'Administrative access to most features',
      isSystem: true,
      permissionIds: Object.keys(permMap)
        .filter((k) => !k.startsWith('roles.') && !k.startsWith('users.manage'))
        .map((k) => permMap[k]),
    },
    {
      name: 'CATALOG_MANAGER',
      description: 'Manage product catalog and categories',
      isSystem: true,
      permissionIds: [
        'dashboard.view',
        'products.view', 'products.create', 'products.edit', 'products.delete',
        'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
        'content.banners',
      ].map((k) => permMap[k]),
    },
    {
      name: 'INVENTORY_MANAGER',
      description: 'Manage product inventory and stock levels',
      isSystem: true,
      permissionIds: [
        'dashboard.view',
        'products.view', 'products.manage-inventory',
      ].map((k) => permMap[k]),
    },
    {
      name: 'ORDER_MANAGER',
      description: 'Manage orders and fulfillment',
      isSystem: true,
      permissionIds: [
        'dashboard.view',
        'orders.view', 'orders.edit', 'orders.manage-status', 'orders.process-refund',
        'customers.view',
        'settings.shipping',
      ].map((k) => permMap[k]),
    },
    {
      name: 'CUSTOMER_SUPPORT',
      description: 'View customers and orders, manage support',
      isSystem: true,
      permissionIds: [
        'dashboard.view',
        'orders.view', 'orders.edit', 'orders.manage-status',
        'customers.view', 'customers.edit',
        'reviews.moderate',
      ].map((k) => permMap[k]),
    },
    {
      name: 'MARKETING_MANAGER',
      description: 'Manage marketing campaigns and promotions',
      isSystem: true,
      permissionIds: [
        'dashboard.view', 'dashboard.export',
        'marketing.promotions', 'marketing.coupons', 'marketing.seo',
        'content.banners', 'content.popups', 'content.announcements',
        'reports.view', 'reports.export',
      ].map((k) => permMap[k]),
    },
    {
      name: 'CONTENT_MANAGER',
      description: 'Manage CMS content and pages',
      isSystem: true,
      permissionIds: [
        'dashboard.view',
        'content.pages', 'content.banners', 'content.popups', 'content.announcements',
        'marketing.seo',
      ].map((k) => permMap[k]),
    },
    {
      name: 'FINANCE_MANAGER',
      description: 'View financial reports and manage refunds',
      isSystem: true,
      permissionIds: [
        'dashboard.view', 'dashboard.export',
        'orders.view', 'orders.process-refund',
        'reports.view', 'reports.export',
        'settings.payment',
      ].map((k) => permMap[k]),
    },
    {
      name: 'READ_ONLY_ANALYST',
      description: 'Read-only access to reports and data',
      isSystem: true,
      permissionIds: [
        'dashboard.view',
        'products.view',
        'categories.view',
        'orders.view',
        'customers.view',
        'reports.view', 'reports.export',
      ].map((k) => permMap[k]),
    },
  ];

  const roles = await AdminRole.insertMany(roleDefs);
  console.log(`  Created ${roles.length} roles.`);

  const superAdminRole = roles.find((r) => r._id.toString() === SUPER_ADMIN_ROLE_ID);
  const adminRole = roles.find((r) => r.name === 'ADMIN');

  // ── 3. Super Admin User ───────────────────────────────────────────────
  console.log('Creating admin users...');
  const adminPwHash = await hashPassword('Admin@123456');
  const superAdmin = await AdminUser.create({
    email: 'admin@shop.com',
    passwordHash: adminPwHash,
    firstName: 'Super',
    lastName: 'Admin',
    roleId: SUPER_ADMIN_ROLE_ID,
    roleName: 'SUPER_ADMIN',
    isActive: true,
    isLocked: false,
    mustChangePassword: false,
    passwordChangedAt: new Date(),
    permissions: allPermissions.map((p) => p.code),
    createdBy: 'SYSTEM_SEED',
  });
  console.log(`  Created super admin: ${superAdmin.email}`);

  // ── 4. Demo Customer User ─────────────────────────────────────────────
  console.log('Creating demo customer...');
  const customerPwHash = await hashPassword('Demo@123456');
  const demoUser = await User.create({
    email: 'demo@shop.com',
    passwordHash: customerPwHash,
    firstName: 'Demo',
    lastName: 'User',
    phone: '+1-555-0100',
    isEmailVerified: true,
    role: 'CUSTOMER',
    lastLoginAt: new Date(),
  });
  console.log(`  Created demo customer: ${demoUser.email}`);

  const demoAddress = await UserAddress.create({
    userId: demoUser._id,
    label: 'Home',
    fullName: 'Demo User',
    phone: '+1-555-0100',
    street: '123 Main Street',
    apartment: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
    isDefault: true,
  });
  console.log(`  Created default address for demo customer.`);

  // ── 5. Categories ─────────────────────────────────────────────────────
  console.log('Creating categories...');
  const catDefs = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Latest gadgets, devices, and electronic accessories',
      imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
      sortOrder: 1,
      children: [
        {
          name: 'Smartphones',
          slug: 'smartphones',
          description: 'Mobile phones and accessories',
          imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
          sortOrder: 1,
        },
        {
          name: 'Laptops',
          slug: 'laptops',
          description: 'Notebooks and ultrabooks',
          imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
          sortOrder: 2,
        },
        {
          name: 'Headphones',
          slug: 'headphones',
          description: 'Wired and wireless audio devices',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          sortOrder: 3,
        },
      ],
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Clothing, footwear, and accessories for men and women',
      imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
      sortOrder: 2,
      children: [
        {
          name: "Men's Clothing",
          slug: 'mens-clothing',
          description: 'Shirts, pants, jackets, and more for men',
          imageUrl: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800',
          sortOrder: 1,
        },
        {
          name: "Women's Clothing",
          slug: 'womens-clothing',
          description: 'Dresses, tops, skirts, and more for women',
          imageUrl: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=800',
          sortOrder: 2,
        },
        {
          name: 'Shoes',
          slug: 'shoes',
          description: 'Footwear for every occasion',
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
          sortOrder: 3,
        },
      ],
    },
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Furniture, decor, kitchenware, and gardening tools',
      imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800',
      sortOrder: 3,
      children: [
        {
          name: 'Furniture',
          slug: 'furniture',
          description: 'Sofas, tables, chairs, and beds',
          imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
          sortOrder: 1,
        },
        {
          name: 'Kitchen',
          slug: 'kitchen',
          description: 'Cookware, utensils, and appliances',
          imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
          sortOrder: 2,
        },
      ],
    },
    {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Sports equipment, activewear, and outdoor gear',
      imageUrl: 'https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800',
      sortOrder: 4,
      children: [
        {
          name: 'Fitness',
          slug: 'fitness',
          description: 'Gym equipment and workout gear',
          imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
          sortOrder: 1,
        },
        {
          name: 'Camping',
          slug: 'camping',
          description: 'Tents, sleeping bags, and camping accessories',
          imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',
          sortOrder: 2,
        },
      ],
    },
    {
      name: 'Books & Media',
      slug: 'books-media',
      description: 'Books, e-books, music, and movies',
      imageUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800',
      sortOrder: 5,
      children: [
        {
          name: 'Fiction',
          slug: 'fiction',
          description: 'Novels and story books',
          imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
          sortOrder: 1,
        },
        {
          name: 'Non-Fiction',
          slug: 'non-fiction',
          description: 'Educational and informational books',
          imageUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=800',
          sortOrder: 2,
        },
      ],
    },
  ];

  const createdCategories = [];
  for (const cat of catDefs) {
    const { children, ...parentData } = cat;
    const parent = await Category.create(parentData);
    createdCategories.push(parent);

    if (children && children.length > 0) {
      for (const child of children) {
        const sub = await Category.create({
          ...child,
          parentId: parent._id.toString(),
          parentName: parent.name,
        });
        createdCategories.push(sub);
      }
    }
  }
  console.log(`  Created ${createdCategories.length} categories.`);

  const catMap = {};
  for (const c of createdCategories) {
    catMap[c.slug] = c;
  }

  // ── 6. Sample Products ────────────────────────────────────────────────
  console.log('Creating sample products...');
  const products = [];

  products.push({
    title: 'Wireless Bluetooth Headphones',
    slug: 'wireless-bluetooth-headphones',
    description: 'Premium noise-cancelling wireless headphones with 30-hour battery life. Features deep bass, comfortable over-ear design, and built-in microphone for calls.',
    categoryId: catMap['headphones']._id.toString(),
    categoryName: 'Headphones',
    categorySlug: 'headphones',
    categoryPath: 'Electronics > Headphones',
    basePrice: 149.99,
    salePrice: 99.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: true,
    soldCount: 1250,
    viewCount: 8750,
    variants: [
      { id: uuidv4(), sku: 'HP-BLK-001', name: 'Black', attributes: { Color: 'Black' }, price: 99.99, stock: 150, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', isActive: true },
      { id: uuidv4(), sku: 'HP-WHT-001', name: 'White', attributes: { Color: 'White' }, price: 99.99, stock: 120, image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600', isActive: true },
      { id: uuidv4(), sku: 'HP-BLU-001', name: 'Navy Blue', attributes: { Color: 'Navy Blue' }, price: 109.99, stock: 80, image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600', isActive: true },
    ],
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', altText: 'Wireless Bluetooth Headphones', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800', altText: 'Headphones white variant', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Brand: 'SoundMax', Connectivity: 'Bluetooth 5.2', BatteryLife: '30 hours' },
    seo: { metaTitle: 'Wireless Bluetooth Headphones - Best Noise Cancelling', metaDescription: 'Premium noise-cancelling wireless headphones with 30-hour battery life.' },
    inventory: { totalStock: 350, reserved: 12, available: 338, lowStockThreshold: 10 },
    ratingSummary: { average: 4.5, count: 312, distribution: { '5': 180, '4': 90, '3': 30, '2': 8, '1': 4 } },
  });

  products.push({
    title: 'Smartphone Pro X',
    slug: 'smartphone-pro-x',
    description: 'Flagship smartphone with 6.7" AMOLED display, 108MP camera, 256GB storage, and all-day battery. Water resistant with premium build quality.',
    categoryId: catMap['smartphones']._id.toString(),
    categoryName: 'Smartphones',
    categorySlug: 'smartphones',
    categoryPath: 'Electronics > Smartphones',
    basePrice: 999.99,
    salePrice: 849.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: true,
    soldCount: 3400,
    viewCount: 22000,
    variants: [
      { id: uuidv4(), sku: 'PH-MID-001', name: 'Midnight Black', attributes: { Color: 'Midnight Black', Storage: '256GB' }, price: 849.99, stock: 200, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600', isActive: true },
      { id: uuidv4(), sku: 'PH-SLV-001', name: 'Silver', attributes: { Color: 'Silver', Storage: '256GB' }, price: 849.99, stock: 150, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600', isActive: true },
      { id: uuidv4(), sku: 'PH-GLD-001', name: 'Gold', attributes: { Color: 'Gold', Storage: '512GB' }, price: 949.99, stock: 100, image: 'https://images.unsplash.com/photo-1572756317709-fe9d15dcefa9?w=600', isActive: true },
    ],
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800', altText: 'Smartphone Pro X', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', altText: 'Smartphone front view', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Brand: 'TechCo', Screen: '6.7" AMOLED', Camera: '108MP', Storage: '256GB/512GB' },
    seo: { metaTitle: 'Smartphone Pro X - Flagship 108MP Camera Phone', metaDescription: 'Flagship smartphone with 6.7" AMOLED display and 108MP camera.' },
    inventory: { totalStock: 450, reserved: 25, available: 425, lowStockThreshold: 20 },
    ratingSummary: { average: 4.7, count: 890, distribution: { '5': 623, '4': 178, '3': 62, '2': 18, '1': 9 } },
  });

  products.push({
    title: 'Ultra-Slim Laptop 15',
    slug: 'ultra-slim-laptop-15',
    description: 'Powerful yet portable 15.6" laptop with Intel i7, 16GB RAM, 512GB SSD. Weighs just 2.8 lbs with all-day battery life. Perfect for professionals.',
    categoryId: catMap['laptops']._id.toString(),
    categoryName: 'Laptops',
    categorySlug: 'laptops',
    categoryPath: 'Electronics > Laptops',
    basePrice: 1299.99,
    salePrice: 1099.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: true,
    soldCount: 2100,
    viewCount: 15400,
    variants: [
      { id: uuidv4(), sku: 'LT-SLV-001', name: 'Silver', attributes: { Color: 'Silver', RAM: '16GB', Storage: '512GB' }, price: 1099.99, stock: 80, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', isActive: true },
      { id: uuidv4(), sku: 'LT-SPC-001', name: 'Space Gray', attributes: { Color: 'Space Gray', RAM: '32GB', Storage: '1TB' }, price: 1399.99, stock: 50, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', isActive: true },
    ],
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', altText: 'Ultra-Slim Laptop', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', altText: 'Laptop side view', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Brand: 'TechCo', Processor: 'Intel i7-13700H', RAM: '16GB / 32GB', Storage: '512GB / 1TB SSD' },
    seo: { metaTitle: 'Ultra-Slim Laptop 15 - Intel i7 16GB RAM', metaDescription: 'Powerful 15.6" ultra-slim laptop with Intel i7 processor.' },
    inventory: { totalStock: 130, reserved: 8, available: 122, lowStockThreshold: 10 },
    ratingSummary: { average: 4.6, count: 445, distribution: { '5': 280, '4': 120, '3': 30, '2': 10, '1': 5 } },
  });

  products.push({
    title: 'Men\'s Classic Fit Oxford Shirt',
    slug: 'mens-classic-oxford-shirt',
    description: 'Timeless cotton oxford shirt, perfect for casual and business casual wear. Pre-shrunk, wrinkle-resistant fabric with button-down collar.',
    categoryId: catMap['mens-clothing']._id.toString(),
    categoryName: "Men's Clothing",
    categorySlug: 'mens-clothing',
    categoryPath: 'Fashion > Men\'s Clothing',
    basePrice: 59.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: false,
    soldCount: 4500,
    viewCount: 18500,
    variants: [
      { id: uuidv4(), sku: 'OX-WHT-S', name: 'White / S', attributes: { Color: 'White', Size: 'S' }, price: 59.99, stock: 100, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', isActive: true },
      { id: uuidv4(), sku: 'OX-WHT-M', name: 'White / M', attributes: { Color: 'White', Size: 'M' }, price: 59.99, stock: 200, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', isActive: true },
      { id: uuidv4(), sku: 'OX-WHT-L', name: 'White / L', attributes: { Color: 'White', Size: 'L' }, price: 59.99, stock: 250, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', isActive: true },
      { id: uuidv4(), sku: 'OX-WHT-XL', name: 'White / XL', attributes: { Color: 'White', Size: 'XL' }, price: 64.99, stock: 150, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', isActive: true },
      { id: uuidv4(), sku: 'OX-BLU-M', name: 'Light Blue / M', attributes: { Color: 'Light Blue', Size: 'M' }, price: 59.99, stock: 180, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', isActive: true },
      { id: uuidv4(), sku: 'OX-BLU-L', name: 'Light Blue / L', attributes: { Color: 'Light Blue', Size: 'L' }, price: 59.99, stock: 220, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', isActive: true },
    ],
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800', altText: 'Classic Oxford Shirt', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736e10?w=800', altText: 'Shirt detail', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Brand: 'HeritageWear', Material: '100% Cotton', Fit: 'Classic Fit', Care: 'Machine Washable' },
    seo: { metaTitle: "Men's Classic Fit Oxford Shirt - 100% Cotton", metaDescription: 'Timeless cotton oxford shirt, wrinkle-resistant fabric.' },
    inventory: { totalStock: 1100, reserved: 45, available: 1055, lowStockThreshold: 50 },
    ratingSummary: { average: 4.3, count: 675, distribution: { '5': 350, '4': 220, '3': 70, '2': 25, '1': 10 } },
  });

  products.push({
    title: 'Running Sneakers Air Max',
    slug: 'running-sneakers-air-max',
    description: 'Lightweight responsive running shoes with air cushioning technology. Breathable mesh upper, rubber outsole for traction, and padded collar for comfort.',
    categoryId: catMap['shoes']._id.toString(),
    categoryName: 'Shoes',
    categorySlug: 'shoes',
    categoryPath: 'Fashion > Shoes',
    basePrice: 129.99,
    salePrice: 89.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: true,
    soldCount: 5200,
    viewCount: 28000,
    variants: [
      { id: uuidv4(), sku: 'SN-BLK-8', name: 'Black / US 8', attributes: { Color: 'Black', Size: 'US 8' }, price: 89.99, stock: 90, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', isActive: true },
      { id: uuidv4(), sku: 'SN-BLK-9', name: 'Black / US 9', attributes: { Color: 'Black', Size: 'US 9' }, price: 89.99, stock: 120, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', isActive: true },
      { id: uuidv4(), sku: 'SN-BLK-10', name: 'Black / US 10', attributes: { Color: 'Black', Size: 'US 10' }, price: 89.99, stock: 100, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', isActive: true },
      { id: uuidv4(), sku: 'SN-BLK-11', name: 'Black / US 11', attributes: { Color: 'Black', Size: 'US 11' }, price: 89.99, stock: 70, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', isActive: true },
      { id: uuidv4(), sku: 'SN-RED-9', name: 'Red / US 9', attributes: { Color: 'Red', Size: 'US 9' }, price: 89.99, stock: 60, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', isActive: true },
      { id: uuidv4(), sku: 'SN-WHT-9', name: 'White / US 9', attributes: { Color: 'White', Size: 'US 9' }, price: 89.99, stock: 85, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', isActive: true },
    ],
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', altText: 'Running Sneakers Air Max', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800', altText: 'Sneakers side view', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Brand: 'SportFlex', Sole: 'Rubber', Upper: 'Mesh', Closure: 'Lace-Up' },
    seo: { metaTitle: 'Running Sneakers Air Max - Lightweight Cushioned', metaDescription: 'Lightweight running shoes with air cushioning technology.' },
    inventory: { totalStock: 525, reserved: 30, available: 495, lowStockThreshold: 30 },
    ratingSummary: { average: 4.4, count: 1020, distribution: { '5': 550, '4': 350, '3': 90, '2': 20, '1': 10 } },
  });

  products.push({
    title: 'Modern Sectional Sofa',
    slug: 'modern-sectional-sofa',
    description: 'Elegant 3-piece sectional sofa with plush cushioning and durable fabric upholstery. Reversible chaise, built-in cup holders, and storage compartment.',
    categoryId: catMap['furniture']._id.toString(),
    categoryName: 'Furniture',
    categorySlug: 'furniture',
    categoryPath: 'Home & Garden > Furniture',
    basePrice: 1899.99,
    salePrice: 1499.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: true,
    soldCount: 680,
    viewCount: 9200,
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', altText: 'Modern Sectional Sofa', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800', altText: 'Sofa in living room', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Brand: 'HomeElegance', Material: 'Polyester Fabric', Color: 'Light Gray', Seating: '3-Seater + Chaise' },
    seo: { metaTitle: 'Modern Sectional Sofa with Chaise - HomeElegance', metaDescription: '3-piece sectional sofa with reversible chaise and storage.' },
    inventory: { totalStock: 40, reserved: 3, available: 37, lowStockThreshold: 5 },
    ratingSummary: { average: 4.2, count: 195, distribution: { '5': 90, '4': 70, '3': 25, '2': 7, '1': 3 } },
  });

  products.push({
    title: 'Stainless Steel Cookware Set',
    slug: 'stainless-steel-cookware-set',
    description: 'Professional 10-piece stainless steel cookware set. Tri-ply construction for even heating, oven safe, dishwasher safe. Includes pots, pans, and lids.',
    categoryId: catMap['kitchen']._id.toString(),
    categoryName: 'Kitchen',
    categorySlug: 'kitchen',
    categoryPath: 'Home & Garden > Kitchen',
    basePrice: 299.99,
    salePrice: 199.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: false,
    soldCount: 1850,
    viewCount: 12100,
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', altText: 'Stainless Steel Cookware Set', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800', altText: 'Cookware pieces', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Brand: 'ChefSelect', Material: 'Stainless Steel', Pieces: '10', OvenSafe: 'Up to 500°F' },
    seo: { metaTitle: '10-Piece Stainless Steel Cookware Set - ChefSelect', metaDescription: 'Professional 10-piece tri-ply stainless steel cookware set.' },
    inventory: { totalStock: 210, reserved: 10, available: 200, lowStockThreshold: 15 },
    ratingSummary: { average: 4.6, count: 520, distribution: { '5': 340, '4': 130, '3': 35, '2': 10, '1': 5 } },
  });

  products.push({
    title: 'Yoga Mat Premium',
    slug: 'yoga-mat-premium',
    description: 'Extra thick 6mm yoga mat with non-slip surface. Eco-friendly TPE material, includes carrying strap. Perfect for yoga, pilates, and stretching.',
    categoryId: catMap['fitness']._id.toString(),
    categoryName: 'Fitness',
    categorySlug: 'fitness',
    categoryPath: 'Sports & Outdoors > Fitness',
    basePrice: 39.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: false,
    soldCount: 7800,
    viewCount: 31000,
    variants: [
      { id: uuidv4(), sku: 'YM-PRP-001', name: 'Purple', attributes: { Color: 'Purple' }, price: 39.99, stock: 300, image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600', isActive: true },
      { id: uuidv4(), sku: 'YM-GRN-001', name: 'Green', attributes: { Color: 'Green' }, price: 39.99, stock: 250, image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600', isActive: true },
      { id: uuidv4(), sku: 'YM-BLU-001', name: 'Blue', attributes: { Color: 'Blue' }, price: 39.99, stock: 280, image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600', isActive: true },
    ],
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800', altText: 'Premium Yoga Mat', sortOrder: 0, type: 'IMAGE' },
    ],
    attributes: { Brand: 'FlexFit', Thickness: '6mm', Material: 'TPE', Weight: '2.5 lbs' },
    seo: { metaTitle: 'Premium Yoga Mat - 6mm Non-Slip TPE', metaDescription: 'Extra thick 6mm yoga mat with non-slip surface and carrying strap.' },
    inventory: { totalStock: 830, reserved: 40, available: 790, lowStockThreshold: 30 },
    ratingSummary: { average: 4.5, count: 1340, distribution: { '5': 800, '4': 380, '3': 120, '2': 30, '1': 10 } },
  });

  products.push({
    title: 'Camping Tent 4-Person',
    slug: 'camping-tent-4-person',
    description: 'Spacious 4-person dome tent with weatherproof flysheet. Easy setup with color-coded poles, mesh windows for ventilation, and storage pockets.',
    categoryId: catMap['camping']._id.toString(),
    categoryName: 'Camping',
    categorySlug: 'camping',
    categoryPath: 'Sports & Outdoors > Camping',
    basePrice: 199.99,
    salePrice: 149.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: false,
    soldCount: 920,
    viewCount: 7800,
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800', altText: '4-Person Camping Tent', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800', altText: 'Tent in campsite', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Brand: 'WildGear', Capacity: '4 Person', Weight: '12.5 lbs', Waterproof: 'Yes' },
    seo: { metaTitle: '4-Person Camping Tent - Easy Setup Weatherproof', metaDescription: 'Spacious 4-person dome tent with weatherproof flysheet.' },
    inventory: { totalStock: 85, reserved: 5, available: 80, lowStockThreshold: 10 },
    ratingSummary: { average: 4.3, count: 310, distribution: { '5': 160, '4': 100, '3': 35, '2': 10, '1': 5 } },
  });

  products.push({
    title: 'The Art of Coding - Best Seller',
    slug: 'the-art-of-coding',
    description: 'A comprehensive guide to modern software development practices. Covers clean code, design patterns, testing, and architecture. Used by top tech companies.',
    categoryId: catMap['non-fiction']._id.toString(),
    categoryName: 'Non-Fiction',
    categorySlug: 'non-fiction',
    categoryPath: 'Books & Media > Non-Fiction',
    basePrice: 34.99,
    currency: 'USD',
    status: 'ACTIVE',
    featured: true,
    soldCount: 12500,
    viewCount: 45000,
    media: [
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800', altText: 'The Art of Coding book', sortOrder: 0, type: 'IMAGE' },
      { id: uuidv4(), url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800', altText: 'Book open on table', sortOrder: 1, type: 'IMAGE' },
    ],
    attributes: { Author: 'John Developer', Format: 'Paperback', Pages: '450', ISBN: '978-0-123-45678-9' },
    seo: { metaTitle: 'The Art of Coding - Best Selling Programming Book', metaDescription: 'Comprehensive guide to modern software development practices.' },
    inventory: { totalStock: 2000, reserved: 100, available: 1900, lowStockThreshold: 50 },
    ratingSummary: { average: 4.8, count: 2100, distribution: { '5': 1680, '4': 320, '3': 70, '2': 20, '1': 10 } },
  });

  const createdProducts = await Product.insertMany(products);
  console.log(`  Created ${createdProducts.length} products.`);

  // ── 7. Website Settings ───────────────────────────────────────────────
  console.log('Creating website settings...');
  const settings = [
    { settingKey: 'site_name', settingValue: 'ShopMax', type: 'string', group: 'general', label: 'Site Name', description: 'The name of your online store' },
    { settingKey: 'site_description', settingValue: 'Your Premier Online Shopping Destination — Discover Amazing Products at Unbeatable Prices', type: 'string', group: 'general', label: 'Site Description', description: 'Brief description for search engines' },
    { settingKey: 'company_name', settingValue: 'ShopMax Inc.', type: 'string', group: 'general', label: 'Company Name', description: 'Legal business name' },
    { settingKey: 'company_email', settingValue: 'support@shopmax.com', type: 'string', group: 'general', label: 'Company Email', description: 'Primary contact email' },
    { settingKey: 'company_phone', settingValue: '+1-800-SHOPMAX', type: 'string', group: 'general', label: 'Company Phone', description: 'Customer support phone number' },
    { settingKey: 'company_address', settingValue: '123 Commerce Drive, Suite 500, San Francisco, CA 94105', type: 'string', group: 'general', label: 'Company Address', description: 'Business physical address' },
    { settingKey: 'default_currency', settingValue: 'USD', type: 'string', group: 'general', label: 'Default Currency', description: 'Default store currency' },
    { settingKey: 'default_language', settingValue: 'en', type: 'string', group: 'general', label: 'Default Language', description: 'Default store language' },
    { settingKey: 'timezone', settingValue: 'America/New_York', type: 'string', group: 'regional', label: 'Timezone', description: 'Store timezone' },
    { settingKey: 'weight_unit', settingValue: 'lbs', type: 'string', group: 'shipping', label: 'Weight Unit', description: 'Unit of measurement for product weight' },
    { settingKey: 'free_shipping_threshold', settingValue: 75, type: 'number', group: 'shipping', label: 'Free Shipping Threshold', description: 'Order amount for free shipping' },
    { settingKey: 'tax_rate', settingValue: 0.08, type: 'number', group: 'tax', label: 'Tax Rate', description: 'Default sales tax rate' },
    { settingKey: 'tax_label', settingValue: 'Sales Tax', type: 'string', group: 'tax', label: 'Tax Label', description: 'Display name for tax' },
    { settingKey: 'order_prefix', settingValue: 'ORD-', type: 'string', group: 'orders', label: 'Order Prefix', description: 'Prefix for order numbers' },
    { settingKey: 'max_order_quantity', settingValue: 10, type: 'number', group: 'orders', label: 'Max Order Quantity', description: 'Maximum quantity per product per order' },
    { settingKey: 'low_stock_threshold', settingValue: 10, type: 'number', group: 'inventory', label: 'Low Stock Threshold', description: 'Threshold for low stock warnings' },
    { settingKey: 'enable_reviews', settingValue: true, type: 'boolean', group: 'products', label: 'Enable Reviews', description: 'Allow customers to leave product reviews' },
    { settingKey: 'auto_approve_reviews', settingValue: false, type: 'boolean', group: 'products', label: 'Auto Approve Reviews', description: 'Automatically approve customer reviews' },
    { settingKey: 'social_facebook', settingValue: 'https://facebook.com/shopmax', type: 'string', group: 'social', label: 'Facebook URL', description: 'Facebook page URL' },
    { settingKey: 'social_twitter', settingValue: 'https://twitter.com/shopmax', type: 'string', group: 'social', label: 'Twitter URL', description: 'Twitter/X profile URL' },
    { settingKey: 'social_instagram', settingValue: 'https://instagram.com/shopmax', type: 'string', group: 'social', label: 'Instagram URL', description: 'Instagram profile URL' },
    { settingKey: 'social_youtube', settingValue: 'https://youtube.com/@shopmax', type: 'string', group: 'social', label: 'YouTube URL', description: 'YouTube channel URL' },
    { settingKey: 'email_order_confirmation', settingValue: true, type: 'boolean', group: 'email', label: 'Order Confirmation Email', description: 'Send order confirmation emails' },
    { settingKey: 'email_shipping_notification', settingValue: true, type: 'boolean', group: 'email', label: 'Shipping Notification Email', description: 'Send shipping update emails' },
    { settingKey: 'store_logo_url', settingValue: '', type: 'string', group: 'appearance', label: 'Store Logo URL', description: 'URL to store logo image' },
    { settingKey: 'favicon_url', settingValue: '', type: 'string', group: 'appearance', label: 'Favicon URL', description: 'URL to favicon image' },
    { settingKey: 'primary_color', settingValue: '#2563eb', type: 'string', group: 'appearance', label: 'Primary Color', description: 'Primary brand color' },
    { settingKey: 'secondary_color', settingValue: '#7c3aed', type: 'string', group: 'appearance', label: 'Secondary Color', description: 'Secondary brand color' },
    { settingKey: 'homepage_meta_title', settingValue: 'ShopMax - Your Premier Online Shopping Destination', type: 'string', group: 'seo', label: 'Homepage Meta Title', description: 'SEO title for the homepage' },
    { settingKey: 'homepage_meta_description', settingValue: 'Discover amazing products at unbeatable prices. Shop electronics, fashion, home goods, and more at ShopMax.', type: 'string', group: 'seo', label: 'Homepage Meta Description', description: 'SEO description for the homepage' },
    { settingKey: 'meta_keywords', settingValue: 'ecommerce, online shopping, electronics, fashion, home goods', type: 'string', group: 'seo', label: 'Meta Keywords', description: 'Default meta keywords for the store' },
    { settingKey: 'google_analytics_id', settingValue: '', type: 'string', group: 'analytics', label: 'Google Analytics ID', description: 'Google Analytics tracking ID' },
    { settingKey: 'terms_updated_at', settingValue: new Date().toISOString(), type: 'string', group: 'legal', label: 'Terms Updated At', description: 'Last update date for terms of service' },
    { settingKey: 'privacy_updated_at', settingValue: new Date().toISOString(), type: 'string', group: 'legal', label: 'Privacy Policy Updated At', description: 'Last update date for privacy policy' },
  ];

  await WebsiteSetting.insertMany(settings);
  console.log(`  Created ${settings.length} website settings.`);

  // ── 8. Feature Flags ──────────────────────────────────────────────────
  console.log('Creating feature flags...');
  const featureFlags = [
    { flagKey: 'maintenance_mode', flagName: 'Maintenance Mode', enabled: false, description: 'Enable to take the site offline for maintenance' },
    { flagKey: 'registration_enabled', flagName: 'User Registration', enabled: true, description: 'Allow new users to register' },
    { flagKey: 'reviews_enabled', flagName: 'Product Reviews', enabled: true, description: 'Enable customer product reviews' },
    { flagKey: 'wishlist_enabled', flagName: 'Wishlist', enabled: true, description: 'Enable wishlist functionality' },
    { flagKey: 'guest_checkout', flagName: 'Guest Checkout', enabled: true, description: 'Allow checkout without account' },
    { flagKey: 'newsletter_enabled', flagName: 'Newsletter', enabled: true, description: 'Enable newsletter subscription' },
    { flagKey: 'coupon_system', flagName: 'Coupon System', enabled: true, description: 'Enable discount coupons' },
    { flagKey: 'loyalty_program', flagName: 'Loyalty Program', enabled: false, description: 'Enable customer loyalty rewards' },
    { flagKey: 'recommendations_enabled', flagName: 'Product Recommendations', enabled: true, description: 'Show product recommendations' },
    { flagKey: 'search_suggestions', flagName: 'Search Suggestions', enabled: true, description: 'Show search suggestions as user types' },
    { flagKey: 'order_tracking', flagName: 'Order Tracking', enabled: true, description: 'Allow customers to track orders' },
    { flagKey: 'social_login', flagName: 'Social Login', enabled: false, description: 'Enable login with social media accounts' },
    { flagKey: 'multicurrency', flagName: 'Multi-Currency', enabled: false, description: 'Show prices in multiple currencies' },
    { flagKey: 'auto_invoice', flagName: 'Auto Invoice', enabled: true, description: 'Auto-generate invoices for completed orders' },
    { flagKey: 'cookie_consent', flagName: 'Cookie Consent Banner', enabled: true, description: 'Show cookie consent banner' },
    { flagKey: 'live_chat', flagName: 'Live Chat', enabled: false, description: 'Enable live chat support' },
  ];

  await FeatureFlag.insertMany(featureFlags);
  console.log(`  Created ${featureFlags.length} feature flags.`);

  // ── 9. CMS Pages ──────────────────────────────────────────────────────
  console.log('Creating CMS pages...');
  const cmsPages = [
    {
      title: 'About Us',
      slug: 'about',
      content: `<h1>About ShopMax</h1><p>Welcome to ShopMax, your premier online shopping destination. Founded in 2024, we've been dedicated to bringing you the best products at unbeatable prices.</p><p>Our mission is to make quality products accessible to everyone, with fast shipping and exceptional customer service.</p><h2>Our Values</h2><ul><li>Quality: We carefully curate every product in our catalog.</li><li>Value: We negotiate the best prices to pass savings to you.</li><li>Service: Our support team is available 24/7 to help.</li><li>Sustainability: We're committed to eco-friendly practices.</li></ul><p>Thank you for choosing ShopMax!</p>`,
      metaTitle: 'About ShopMax - Our Story',
      metaDescription: 'Learn about ShopMax, your premier online shopping destination.',
      status: 'published',
      isSystem: true,
    },
    {
      title: 'Contact Us',
      slug: 'contact',
      content: `<h1>Contact Us</h1><p>We'd love to hear from you! Reach out to our team using any of the methods below.</p><h2>Customer Support</h2><p>Email: support@shopmax.com<br>Phone: +1-800-SHOPMAX<br>Hours: Monday - Friday, 9AM - 6PM EST</p><h2>Business Inquiries</h2><p>Email: business@shopmax.com</p><h2>Press & Media</h2><p>Email: press@shopmax.com</p><h2>Office Address</h2><p>123 Commerce Drive, Suite 500<br>San Francisco, CA 94105<br>United States</p>`,
      metaTitle: 'Contact Us - ShopMax Support',
      metaDescription: 'Get in touch with ShopMax customer support.',
      status: 'published',
      isSystem: true,
    },
    {
      title: 'Frequently Asked Questions',
      slug: 'faq',
      content: `<h1>Frequently Asked Questions</h1><h2>Orders & Shipping</h2><h3>How long does shipping take?</h3><p>Standard shipping takes 5-7 business days. Express shipping is available for 2-3 business days.</p><h3>Do you ship internationally?</h3><p>Yes, we ship to over 50 countries worldwide. International shipping typically takes 7-14 business days.</p><h3>Can I change my shipping address after placing an order?</h3><p>Yes, contact our support team within 1 hour of placing your order to update the address.</p><h2>Returns & Refunds</h2><h3>What is your return policy?</h3><p>We offer a 30-day return policy on most items. Products must be unused and in original packaging.</p><h3>How long do refunds take?</h3><p>Refunds are processed within 5-7 business days after we receive the returned item.</p><h2>Payment</h2><h3>What payment methods do you accept?</h3><p>We accept Visa, Mastercard, American Express, PayPal, and Apple Pay.</p><h3>Is my payment information secure?</h3><p>Yes, we use industry-standard SSL encryption to protect your payment information.</p>`,
      metaTitle: 'FAQ - Frequently Asked Questions | ShopMax',
      metaDescription: 'Find answers to common questions about ordering, shipping, returns, and more.',
      status: 'published',
      isSystem: true,
    },
    {
      title: 'Terms of Service',
      slug: 'terms',
      content: `<h1>Terms of Service</h1><p>Last updated: ${new Date().toLocaleDateString()}</p><h2>1. Acceptance of Terms</h2><p>By accessing and using ShopMax, you agree to be bound by these Terms of Service.</p><h2>2. Account Registration</h2><p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.</p><h2>3. Products and Pricing</h2><p>We reserve the right to modify prices and availability at any time. All prices are in USD unless otherwise noted.</p><h2>4. Orders</h2><p>We reserve the right to refuse or cancel any order. In the event of a pricing error, we will notify you and offer the option to cancel.</p><h2>5. Intellectual Property</h2><p>All content on ShopMax is our property and may not be reproduced without permission.</p><h2>6. Limitation of Liability</h2><p>ShopMax shall not be liable for any indirect, incidental, or consequential damages.</p><h2>7. Contact</h2><p>For questions about these terms, contact us at support@shopmax.com.</p>`,
      metaTitle: 'Terms of Service | ShopMax',
      metaDescription: 'ShopMax terms of service and conditions of use.',
      status: 'published',
      isSystem: true,
    },
    {
      title: 'Privacy Policy',
      slug: 'privacy',
      content: `<h1>Privacy Policy</h1><p>Last updated: ${new Date().toLocaleDateString()}</p><h2>1. Information We Collect</h2><p>We collect information you provide when creating an account, placing an order, or contacting us. This includes your name, email address, shipping address, and payment information.</p><h2>2. How We Use Your Information</h2><p>We use your information to process orders, improve our services, send order updates, and provide customer support.</p><h2>3. Data Security</h2><p>We implement industry-standard security measures to protect your personal information.</p><h2>4. Third-Party Services</h2><p>We may share your information with trusted third parties for payment processing and shipping.</p><h2>5. Cookies</h2><p>We use cookies to enhance your browsing experience and analyze site traffic.</p><h2>6. Your Rights</h2><p>You may access, update, or delete your personal information at any time through your account settings.</p><h2>7. Contact</h2><p>For privacy-related inquiries, contact us at privacy@shopmax.com.</p>`,
      metaTitle: 'Privacy Policy | ShopMax',
      metaDescription: 'ShopMax privacy policy and data protection practices.',
      status: 'published',
      isSystem: true,
    },
    {
      title: 'Shipping Policy',
      slug: 'shipping-policy',
      content: `<h1>Shipping Policy</h1><h2>Shipping Methods</h2><p>We offer the following shipping methods:<br>• Standard (5-7 business days) - Free on orders over $75<br>• Express (2-3 business days) - $12.99<br>• Overnight (1 business day) - $24.99</p><h2>Processing Time</h2><p>Orders are processed within 1-2 business days. Orders placed on weekends or holidays are processed the next business day.</p><h2>International Shipping</h2><p>We ship to over 50 countries. International orders are shipped via priority mail and typically arrive within 7-14 business days. Duties and taxes may apply.</p><h2>Tracking</h2><p>You will receive a tracking number via email once your order ships.</p>`,
      metaTitle: 'Shipping Policy | ShopMax',
      metaDescription: 'ShopMax shipping policy, rates, and delivery times.',
      status: 'published',
      isSystem: true,
    },
    {
      title: 'Returns Policy',
      slug: 'returns-policy',
      content: `<h1>Returns & Refunds Policy</h1><h2>30-Day Return Policy</h2><p>We accept returns within 30 days of delivery. Items must be unused and in their original packaging.</p><h2>How to Return</h2><p>1. Log into your account and initiate a return<br>2. Print the return shipping label<br>3. Pack the item securely with all accessories<br>4. Drop off at any carrier location</p><h2>Refund Timeline</h2><p>Refunds are processed within 5-7 business days after we receive your return. Funds are returned to your original payment method.</p><h2>Non-Returnable Items</h2><p>Certain items cannot be returned, including personalized items, digital products, and intimate apparel.</p><h2>Damaged Items</h2><p>If you receive a damaged item, contact us within 48 hours with photos for a replacement or full refund.</p>`,
      metaTitle: 'Returns Policy | ShopMax',
      metaDescription: 'ShopMax returns and refunds policy.',
      status: 'published',
      isSystem: true,
    },
  ];

  await CmsPage.insertMany(cmsPages);
  console.log(`  Created ${cmsPages.length} CMS pages.`);

  // ── 10. Demo Orders ───────────────────────────────────────────────────
  console.log('Creating demo orders...');
  const product0 = createdProducts[0];
  const product1 = createdProducts[1];
  const product4 = createdProducts[4];
  const product7 = createdProducts[7];
  const product9 = createdProducts[9];

  const variant0 = product0.variants[0];
  const variant1 = product1.variants[0];
  const variant4 = product4.variants[1];
  const variant7 = product7.variants[0];

  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000);

  const orders = [
    {
      orderNumber: 'ORD-1001',
      userId: demoUser._id.toString(),
      status: 'DELIVERED',
      paymentStatus: 'COMPLETED',
      fulfillmentStatus: 'FULFILLED',
      subtotal: 189.98,
      taxAmount: 15.20,
      shippingCost: 0,
      discountTotal: 10.00,
      grandTotal: 195.18,
      userEmail: 'demo@shop.com',
      userPhone: '+1-555-0100',
      shippingAddress: {
        fullName: 'Demo User',
        street: '123 Main Street',
        apartment: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
        phone: '+1-555-0100',
      },
      shippingAddressSnapshot: {
        fullName: 'Demo User',
        street: '123 Main Street',
        apartment: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
        phone: '+1-555-0100',
      },
      items: [
        {
          id: uuidv4(),
          productId: product0._id.toString(),
          variantId: variant0.id,
          quantity: 1,
          unitPrice: 99.99,
          totalPrice: 99.99,
          productTitle: product0.title,
          productName: product0.title,
          productImage: product0.media[0].url,
          productSku: variant0.sku,
          variantSku: variant0.sku,
          variantName: variant0.name,
        },
        {
          id: uuidv4(),
          productId: product4._id.toString(),
          variantId: variant4.id,
          quantity: 1,
          unitPrice: 89.99,
          totalPrice: 89.99,
          productTitle: product4.title,
          productName: product4.title,
          productImage: product4.media[0].url,
          productSku: variant4.sku,
          variantSku: variant4.sku,
          variantName: variant4.name,
        },
      ],
      statusHistory: [
        { status: 'PENDING', note: 'Order placed', changedAt: daysAgo(10) },
        { status: 'CONFIRMED', note: 'Payment confirmed', changedAt: daysAgo(10) },
        { status: 'PROCESSING', note: 'Order is being prepared', changedAt: daysAgo(9) },
        { status: 'SHIPPED', note: 'Package shipped via USPS', changedAt: daysAgo(8) },
        { status: 'DELIVERED', note: 'Package delivered', changedAt: daysAgo(6) },
      ],
    },
    {
      orderNumber: 'ORD-1002',
      userId: demoUser._id.toString(),
      status: 'SHIPPED',
      paymentStatus: 'COMPLETED',
      fulfillmentStatus: 'PARTIALLY_FULFILLED',
      subtotal: 149.99,
      taxAmount: 12.00,
      shippingCost: 12.99,
      discountTotal: 0,
      grandTotal: 174.98,
      userEmail: 'demo@shop.com',
      userPhone: '+1-555-0100',
      shippingAddress: {
        fullName: 'Demo User',
        street: '123 Main Street',
        apartment: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
        phone: '+1-555-0100',
      },
      shippingAddressSnapshot: {
        fullName: 'Demo User',
        street: '123 Main Street',
        apartment: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
        phone: '+1-555-0100',
      },
      items: [
        {
          id: uuidv4(),
          productId: product7._id.toString(),
          variantId: variant7.id,
          quantity: 1,
          unitPrice: 39.99,
          totalPrice: 39.99,
          productTitle: product7.title,
          productName: product7.title,
          productImage: product7.media[0].url,
          productSku: variant7.sku,
          variantSku: variant7.sku,
          variantName: variant7.name,
        },
        {
          id: uuidv4(),
          productId: product9._id.toString(),
          quantity: 2,
          unitPrice: 34.99,
          totalPrice: 69.98,
          productTitle: product9.title,
          productName: product9.title,
          productImage: product9.media[0].url,
          productSku: 'BK-001',
        },
        {
          id: uuidv4(),
          productId: product1._id.toString(),
          variantId: variant1.id,
          quantity: 1,
          unitPrice: 40.02,
          totalPrice: 40.02,
          productTitle: product1.title + ' - Accessory Pack',
          productName: product1.title + ' - Accessory Pack',
          productImage: product1.media[0].url,
          productSku: 'PH-ACC-001',
          variantSku: 'PH-ACC-001',
          variantName: 'Accessory Pack',
        },
      ],
      statusHistory: [
        { status: 'PENDING', note: 'Order placed', changedAt: daysAgo(4) },
        { status: 'CONFIRMED', note: 'Payment confirmed', changedAt: daysAgo(4) },
        { status: 'PROCESSING', note: 'Preparing items', changedAt: daysAgo(3) },
        { status: 'SHIPPED', note: 'Shipped via FedEx, tracking: FX1234567890', changedAt: daysAgo(1) },
      ],
    },
    {
      orderNumber: 'ORD-1003',
      userId: demoUser._id.toString(),
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      fulfillmentStatus: 'UNFULFILLED',
      subtotal: 1099.99,
      taxAmount: 88.00,
      shippingCost: 0,
      discountTotal: 50.00,
      grandTotal: 1137.99,
      userEmail: 'demo@shop.com',
      userPhone: '+1-555-0100',
      shippingAddress: {
        fullName: 'Demo User',
        street: '123 Main Street',
        apartment: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
        phone: '+1-555-0100',
      },
      shippingAddressSnapshot: {
        fullName: 'Demo User',
        street: '123 Main Street',
        apartment: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
        phone: '+1-555-0100',
      },
      notes: 'Please leave package at the front desk.',
      items: [
        {
          id: uuidv4(),
          productId: product0._id.toString(),
          variantId: product0.variants[2].id,
          quantity: 1,
          unitPrice: 109.99,
          totalPrice: 109.99,
          productTitle: product0.title,
          productName: product0.title,
          productImage: product0.media[0].url,
          productSku: product0.variants[2].sku,
          variantSku: product0.variants[2].sku,
          variantName: product0.variants[2].name,
        },
        {
          id: uuidv4(),
          productId: product1._id.toString(),
          variantId: product1.variants[2].id,
          quantity: 1,
          unitPrice: 949.99,
          totalPrice: 949.99,
          productTitle: product1.title,
          productName: product1.title,
          productImage: product1.media[0].url,
          productSku: product1.variants[2].sku,
          variantSku: product1.variants[2].sku,
          variantName: product1.variants[2].name,
        },
        {
          id: uuidv4(),
          productId: product7._id.toString(),
          variantId: product7.variants[1].id,
          quantity: 1,
          unitPrice: 39.99,
          totalPrice: 39.99,
          productTitle: product7.title,
          productName: product7.title,
          productImage: product7.media[0].url,
          productSku: product7.variants[1].sku,
          variantSku: product7.variants[1].sku,
          variantName: product7.variants[1].name,
        },
      ],
      statusHistory: [
        { status: 'PENDING', note: 'Order placed', changedAt: daysAgo(2) },
        { status: 'CONFIRMED', note: 'Payment confirmed', changedAt: daysAgo(2) },
        { status: 'PROCESSING', note: 'Order is being processed', changedAt: daysAgo(1) },
      ],
    },
  ];

  const createdOrders = await Order.insertMany(orders);
  console.log(`  Created ${createdOrders.length} orders.`);

  const payments = [
    {
      orderId: createdOrders[0]._id.toString(),
      userId: demoUser._id.toString(),
      provider: 'STRIPE',
      amount: 195.18,
      currency: 'USD',
      status: 'COMPLETED',
      transactionRef: 'pi_3MqL0tLkdIwHu7ix0wXZqV1e',
    },
    {
      orderId: createdOrders[1]._id.toString(),
      userId: demoUser._id.toString(),
      provider: 'PAYPAL',
      amount: 174.98,
      currency: 'USD',
      status: 'COMPLETED',
      transactionRef: 'PAYID-MY5K3PA0LK123456X',
    },
    {
      orderId: createdOrders[2]._id.toString(),
      userId: demoUser._id.toString(),
      provider: 'STRIPE',
      amount: 1137.99,
      currency: 'USD',
      status: 'COMPLETED',
      transactionRef: 'pi_3NpR1sLkdIwHu7ix1yAbZ2wF',
    },
  ];

  await Payment.insertMany(payments);
  console.log(`  Created ${payments.length} payments.`);

  const shipments = [
    {
      orderId: createdOrders[0]._id.toString(),
      courier: 'USPS',
      trackingNumber: '9400111899223456789012',
      status: 'DELIVERED',
      shippedAt: daysAgo(8),
      deliveredAt: daysAgo(6),
    },
    {
      orderId: createdOrders[1]._id.toString(),
      courier: 'FedEx',
      trackingNumber: 'FX1234567890',
      status: 'IN_TRANSIT',
      shippedAt: daysAgo(1),
    },
  ];

  await Shipment.insertMany(shipments);
  console.log(`  Created ${shipments.length} shipments.`);

  // ── Coupons ──────────────────────────────────────────────────────────
  console.log('Creating coupons...');
  const Coupon = require('../src/models/Coupon');
  const coupons = [
    {
      code: 'WELCOME10',
      description: 'Get US $10 off your first order',
      discountType: 'FIXED',
      discountValue: 10,
      minOrderAmount: 20,
      isActive: true,
      usageLimit: 1000,
      usedCount: 0,
    },
    {
      code: 'SUMMER50',
      description: 'Summer sale up to 50% off',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      minOrderAmount: 50,
      isActive: true,
      usageLimit: 500,
      usedCount: 0,
    }
  ];
  await Coupon.insertMany(coupons);
  console.log(`  Created ${coupons.length} coupons.`);

  console.log('\n✅ Seed completed successfully!');
  console.log(`  Admin login:  admin@shop.com / Admin@123456`);
  console.log(`  Demo login:   demo@shop.com / Demo@123456`);
}

if (require.main === module) {
  seed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}

module.exports = seed;
