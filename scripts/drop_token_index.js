require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_db';

async function dropIndex() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB. Dropping token_1 index from passwordresettokens...');
    const collection = mongoose.connection.collection('passwordresettokens');
    await collection.dropIndex('token_1');
    console.log('Index dropped successfully.');
  } catch (err) {
    if (err.code === 27) {
      console.log('Index not found, nothing to drop.');
    } else {
      console.error('Error dropping index:', err);
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

dropIndex();
