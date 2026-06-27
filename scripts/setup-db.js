require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const config = require('../src/config');

// Load all models so schemas + indexes are registered with Mongoose
const modelFiles = [
  'AdminPermission', 'AdminRole', 'AdminSession', 'AdminUser',
  'AuditLog', 'Banner', 'AnnouncementBar', 'Popup',
  'Cart', 'Category', 'Attribute', 'CmsPage',
  'Coupon', 'FeatureFlag', 'HomepageSection',
  'Order', 'PasswordResetToken', 'Payment', 'PaymentGatewayConfig',
  'PaymentTransaction', 'PopularSearch', 'Product', 'ProductRelation',
  'Refund', 'Return', 'Review',
  'SearchAnalytics', 'SearchIndex', 'Shipment', 'SmtpConfig',
  'TrendingProduct', 'User', 'UserAddress', 'UserEvent',
  'UserPaymentMethod', 'UserWishlist', 'WebsiteSetting',
];

for (const name of modelFiles) {
  require(`../src/models/${name}`);
}

const seed = require('./seed');

async function setupDatabase() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongodbUri);
  console.log(`Connected: ${mongoose.connection.host}\n`);

  // 1. Drop database for a clean slate
  console.log('Dropping existing database...');
  await mongoose.connection.dropDatabase();
  console.log('Database dropped.\n');

  // 2. Create collections + indexes via syncIndexes
  const models = mongoose.modelNames();
  console.log(`Creating ${models.length} collections with indexes...`);
  for (const name of models) {
    const model = mongoose.model(name);
    await model.syncIndexes();
    console.log(`  \u2713 ${name}`);
  }
  console.log('\nAll collections and indexes created.\n');

  // 3. Insert dummy / seed data
  console.log('Inserting seed data...');
  await seed();
  
  // Exit gracefully
  console.log('Setup finished gracefully.');
  process.exit(0);
}

setupDatabase().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
