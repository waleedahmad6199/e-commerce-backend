require('dotenv').config();
const mongoose = require('mongoose');
const Banner = require('./src/models/Banner');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_db');
    console.log('Connected to DB');

    const banners = [
      {
        title: 'Latest trending',
        subtitle: 'Electronic items',
        imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1200&auto=format&fit=crop',
        linkUrl: '/search?categoryId=computer-and-tech',
        linkText: 'Explore now',
        position: 'hero',
        sortOrder: 1,
        isActive: true,
      },
      {
        title: 'Summer sale',
        subtitle: 'Up to 50% off',
        imageUrl: 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=1200&auto=format&fit=crop',
        linkUrl: '/search',
        linkText: 'Explore now',
        position: 'hero',
        sortOrder: 2,
        isActive: true,
      },
      {
        title: 'Cozy Home Interiors',
        subtitle: 'Redecorate your living space today',
        imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop',
        linkUrl: '/search?categoryId=home-interiors',
        linkText: 'Explore now',
        position: 'hero',
        sortOrder: 3,
        isActive: true,
      }
    ];

    await Banner.deleteMany({ position: 'hero' }); // clear existing hero banners to be safe
    await Banner.insertMany(banners);
    console.log('Dummy hero banners inserted!');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
