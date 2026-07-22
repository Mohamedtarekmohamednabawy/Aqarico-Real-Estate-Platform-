/**
 * Database Seeder — Populates MongoDB with property data from Processed_Properties_with_Images.xlsx
 *
 * Usage: npm run seed
 *
 * This script:
 * 1. Creates a system user to own the seeded properties
 * 2. Reads the Excel file and maps columns to the Property model
 * 3. Inserts all records into MongoDB
 *
 * Run with: node seeder.js
 * To clear all data first, run: node seeder.js --clear
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import Property from './models/Property.js';
import User from './models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/aqarico';

const connectDB = async () => {
  const envUri = process.env.MONGODB_URI;

  // --- Try Atlas / .env URI first ---
  if (envUri && envUri.trim() !== '') {
    try {
      await mongoose.connect(envUri);
      console.log('✅ MongoDB Connected (Atlas / .env) for seeding');
      return;
    } catch (error) {
      console.warn(`⚠️  Could not connect to Atlas URI: ${error.message}`);
      console.warn('   Falling back to local MongoDB...');
    }
  } else {
    console.warn('⚠️  MONGODB_URI is not set in .env — trying local MongoDB...');
  }

  // --- Fallback: local desktop MongoDB ---
  try {
    await mongoose.connect(LOCAL_MONGO_URI);
    console.log(`✅ MongoDB Connected (local: ${LOCAL_MONGO_URI}) for seeding`);
  } catch (localError) {
    console.error('❌ Could not connect to local MongoDB either:', localError.message);
    console.error('   Make sure MongoDB is running locally (mongod) or your .env MONGODB_URI is correct.');
    process.exit(1);
  }
};

// Map finish values from dataset to our enum
const mapFinish = (value) => {
  if (!value) return '';
  const finishMap = {
    'Semi Finished': 'Semi Finished',
    'Lux': 'Lux',
    'Super Lux': 'Super Lux',
    'Extra Super Lux': 'Extra Super Lux',
    'Without Finish': 'Without Finish',
  };
  return finishMap[value] || '';
};

// Location coordinates mapping (approximate center for each area)
const locationCoords = {
  "Abo Qir": { lat: 31.3167, lng: 30.0667 },
  "Camp Cesar": { lat: 31.2052, lng: 29.9195 },
  "San Stefano": { lat: 31.2455, lng: 29.9717 },
  "Lauran": { lat: 31.2541, lng: 29.9918 },
  "Bakoos": { lat: 31.2384, lng: 29.9670 },
  "Glim": { lat: 31.2575, lng: 29.9965 },
  "Fleming": { lat: 31.2462, lng: 29.9853 },
  "Cleopatra": { lat: 31.2215, lng: 29.9482 },
  "Sidi Gaber": { lat: 31.2387, lng: 29.9635 },
  "Roshdy": { lat: 31.2422, lng: 29.9733 },
  "Smouha": { lat: 31.2183, lng: 29.9581 },
  "Zezenia": { lat: 31.2415, lng: 29.9772 },
  "Kafr Abdo": { lat: 31.2300, lng: 29.9550 },
  "Sidi Bishr": { lat: 31.2652, lng: 29.9983 },
  "Bolekly": { lat: 31.2390, lng: 29.9620 },
  "El Mandara": { lat: 31.2725, lng: 30.0104 },
  "El Seyouf": { lat: 31.2492, lng: 29.9930 },
  "El Awayed": { lat: 31.2241, lng: 29.9965 },
  "Abu Youssef": { lat: 31.0667, lng: 29.7500 },
  "Bahary": { lat: 31.2035, lng: 29.8882 },
  "Mansheya": { lat: 31.1999, lng: 29.9060 },
  "Ibrahimia": { lat: 31.2173, lng: 29.9328 },
  "El Asafra": { lat: 31.2685, lng: 30.0050 },
  "Miami": { lat: 31.2655, lng: 29.9922 },
  "Sporting": { lat: 31.2237, lng: 29.9570 },
  "El Chatby": { lat: 31.2105, lng: 29.9242 },
  "Ganaklis": { lat: 31.2468, lng: 29.9880 },
  "Victorya": { lat: 31.2588, lng: 29.9972 },
  "El Hadara": { lat: 31.1965, lng: 29.9405 },
  "Moharram Bek": { lat: 31.1895, lng: 29.9262 },
  "Saba Basha": { lat: 31.2450, lng: 29.9785 },
  "Mahta El Raml": { lat: 31.1996, lng: 29.9056 },
  "El Amreya": { lat: 31.0238, lng: 29.8152 },
  "Stanley": { lat: 31.2479, lng: 29.9790 },
  "El Mamoura": { lat: 31.2858, lng: 30.0355 },
  "El Montazah": { lat: 31.2925, lng: 30.0198 },
  "El Bitash": { lat: 31.1092, lng: 29.7712 },
  "El Qabari": { lat: 31.1833, lng: 29.8833 },
  "El Wardiyan": { lat: 31.1785, lng: 29.8785 },
  "Mina El Basal": { lat: 31.1855, lng: 29.8920 },
  "King Mariout": { lat: 31.0255, lng: 29.8200 },
  "Abu Talat": { lat: 31.0425, lng: 29.7350 },
  "El Dekhila": { lat: 31.1444, lng: 29.8188 },
  "El Hanouvel": { lat: 31.0833, lng: 29.7500 },
  "Kilo 21": { lat: 31.0333, lng: 29.7333 },
  "El Max": { lat: 31.1555, lng: 29.8450 },
  "El Saa'ah Sq": { lat: 31.2452, lng: 29.9822 },
  "Ras Al Tin": { lat: 31.2065, lng: 29.8710 },
};

const seedData = async () => {
  try {
    await connectDB();

    const args = process.argv.slice(2);

    // Clear existing data if --clear flag
    if (args.includes('--clear')) {
      console.log('🗑️  Clearing existing property data...');
      await Property.deleteMany({});
      console.log('✅ Properties cleared');

      if (args.includes('--clear-all')) {
        await User.deleteMany({});
        console.log('✅ Users cleared');
      }
    }

    // Create or find a system user to own seeded properties
    let systemUser = await User.findOne({ email: 'system@aqarico.com' });
    if (!systemUser) {
      systemUser = await User.create({
        firstName: 'Aqarico',
        lastName: 'System',
        email: 'system@aqarico.com',
        password: 'System2024!@#',
        role: 'admin',
        country: 'EG',
      });
      console.log('✅ System user created (system@aqarico.com)');
    }

    // Read Excel file
    const excelPath = path.join(__dirname, '..', 'Processed_Properties_with_Title.xlsx');
    console.log(`📄 Reading ${excelPath}...`);

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${rawData.length} records in Excel file`);

    // Map Excel rows to Property documents
    const properties = rawData.map((row, index) => {
      const location = row['Location'] || '';
      const coords = locationCoords[location] || null;

      return {
        title: `${row['Finish'] || 'Standard'} Property in ${location}`.substring(0, 50),
        description: `${row['Bedrooms'] || 2} bedroom property in ${location}, ${row['District'] || 'Alexandria'}. ${row['Area'] || 100}m² with ${row['Finish'] || 'standard'} finish.`,
        price: row['Price'] || 0,
        location: location,
        coordinates: coords,
        type: 'sale', // All dataset properties are for sale
        category: 'Apartment', // Default — dataset doesn't have this field
        area: row['Area'] || 0,
        bedrooms: row['Bedrooms'] || 0,
        bathrooms: row['Bathrooms'] || 1,
        images: Object.keys(row).filter(key => key.startsWith('Image_UR')).map(key => row[key]).filter(url => url),
        amenities: [
          row['Furnished'] && 'Furnished',
          row['Elevator'] && 'Elevator',
          row['Security'] && 'Security',
          row['Natural Gas'] && 'Natural Gas',
          row['Electricity Meter'] && 'Electricity Meter',
          row['Water Meter'] && 'Water Meter',
        ].filter(Boolean),
        furnished: row['Furnished'] || 0,
        electricityMeter: row['Electricity Meter'] || 0,
        naturalGas: row['Natural Gas'] || 0,
        waterMeter: row['Water Meter'] || 0,
        elevator: row['Elevator'] || 0,
        security: row['Security'] || 0,
        district: row['District'] || '',
        finish: mapFinish(row['Finish']),
        yearBuilt: row['Year Built'] || 2015,
        floor: row['Floor'] || 0,
        predictedPrice: null,
        owner: systemUser._id,
        isVerified: true, // Seed data is trusted
        status: 'available',
        provenanceTag: 'dataset_seed',
        views: Math.floor(Math.random() * 100),
      };
    });

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < properties.length; i += BATCH_SIZE) {
      const batch = properties.slice(i, i + BATCH_SIZE);
      await Property.insertMany(batch, { ordered: false });
      inserted += batch.length;
      console.log(`  ✅ Inserted ${inserted}/${properties.length} properties...`);
    }

    console.log(`\n🎉 Seeding complete! ${inserted} properties inserted into MongoDB.`);
    console.log(`   System user: system@aqarico.com / System2024!@#`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();
