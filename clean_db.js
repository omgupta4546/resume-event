const mongoose = require('mongoose');
const VoteRecord = require('./server/models/VoteRecord');
require('dotenv').config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://omg4546:2555@cluster0.p7i2u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function clean() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    await VoteRecord.deleteMany({});
    console.log('All previous test polls have been deleted successfully.');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

clean();
