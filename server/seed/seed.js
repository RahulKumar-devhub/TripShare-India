// Run with: npm run seed
// Creates one admin account and 12 sample Indian events with future dates.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Event = require('../models/Event');

// Helper: returns a Date some number of days from now.
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const sampleEvents = [
  {
    title: 'Delhi Winter Music Fest',
    description: 'An open-air night of live Indian indie and fusion bands at the heart of the capital.',
    city: 'Delhi',
    venue: 'Jawaharlal Nehru Stadium Grounds',
    date: daysFromNow(20),
    time: '18:00',
    category: 'Concerts',
    price: 1499,
    rating: 4.6,
    totalSeats: 500,
    availableSeats: 500,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Capital Live Events',
    tags: ['music', 'nightlife', 'live band']
  },
  {
    title: 'Mumbai Standup Comedy Night',
    description: 'A rapid-fire lineup of five popular Mumbai comedians riffing on city life.',
    city: 'Mumbai',
    venue: 'Prithvi Theatre',
    date: daysFromNow(12),
    time: '20:00',
    category: 'Theatre',
    price: 699,
    rating: 4.4,
    totalSeats: 180,
    availableSeats: 180,
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80',
    organiser: 'LaughTrack Productions',
    tags: ['comedy', 'evening']
  },
  {
    title: 'Jaipur Heritage Marathon',
    description: 'A sunrise run through Jaipur\'s pink-walled old city and palace roads.',
    city: 'Jaipur',
    venue: 'Amer Fort Road',
    date: daysFromNow(35),
    time: '05:30',
    category: 'Sports',
    price: 999,
    rating: 4.7,
    totalSeats: 1200,
    availableSeats: 1200,
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Pink City Runners Club',
    tags: ['running', 'fitness', 'heritage']
  },
  {
    title: 'Chandigarh Street Food Carnival',
    description: 'Over 40 stalls of North Indian street food, chaat, and dessert pop-ups.',
    city: 'Chandigarh',
    venue: 'Sector 17 Plaza',
    date: daysFromNow(8),
    time: '17:00',
    category: 'Food',
    price: 199,
    rating: 4.3,
    totalSeats: 2000,
    availableSeats: 2000,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Tricity Foodies Collective',
    tags: ['food', 'family', 'weekend']
  },
  {
    title: 'Amritsar Golden Temple Heritage Walk',
    description: 'A guided evening heritage walk through the old city ending at the Golden Temple langar hall.',
    city: 'Amritsar',
    venue: 'Town Hall, Amritsar',
    date: daysFromNow(15),
    time: '16:30',
    category: 'Festivals',
    price: 349,
    rating: 4.8,
    totalSeats: 60,
    availableSeats: 60,
    image: 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Punjab Heritage Tours',
    tags: ['culture', 'walking tour', 'spiritual']
  },
  {
    title: 'Rishikesh Yoga & Meditation Retreat Day',
    description: 'A full day of guided Himalayan yoga, breathwork, and a sunset Ganga aarti.',
    city: 'Rishikesh',
    venue: 'Parmarth Niketan Ashram',
    date: daysFromNow(25),
    time: '06:00',
    category: 'Wellness',
    price: 1299,
    rating: 4.9,
    totalSeats: 80,
    availableSeats: 80,
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Ganga Wellness Foundation',
    tags: ['yoga', 'meditation', 'retreat']
  },
  {
    title: 'Kochi Backwater Music Cruise',
    description: 'Live acoustic sets on a traditional houseboat cruising the Kerala backwaters at sunset.',
    city: 'Kochi',
    venue: 'Vembanad Lake Jetty',
    date: daysFromNow(18),
    time: '17:30',
    category: 'Concerts',
    price: 1799,
    rating: 4.6,
    totalSeats: 90,
    availableSeats: 90,
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Backwater Sounds',
    tags: ['music', 'cruise', 'sunset']
  },
  {
    title: 'Bengaluru Tech & Gaming Expo',
    description: 'Hands-on demos of indie games, VR booths, and esports finals under one roof.',
    city: 'Bengaluru',
    venue: 'KTPO Convention Centre',
    date: daysFromNow(30),
    time: '10:00',
    category: 'Festivals',
    price: 599,
    rating: 4.5,
    totalSeats: 3000,
    availableSeats: 3000,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Silicon City Events',
    tags: ['gaming', 'tech', 'esports']
  },
  {
    title: 'Goa Beach Sunset Football Cup',
    description: 'A friendly five-a-side beach football tournament open to walk-in teams, followed by a bonfire.',
    city: 'Goa',
    venue: 'Ashwem Beach',
    date: daysFromNow(22),
    time: '15:30',
    category: 'Sports',
    price: 449,
    rating: 4.4,
    totalSeats: 300,
    availableSeats: 300,
    image: 'https://images.unsplash.com/photo-1487466365202-1afdb86c764e?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Goa Beach Sports Club',
    tags: ['football', 'beach', 'bonfire']
  },
  {
    title: 'Pune Classical Fusion Night',
    description: 'A late-evening concert blending Hindustani classical vocals with modern electronic production.',
    city: 'Pune',
    venue: 'Balgandharva Rang Mandir',
    date: daysFromNow(27),
    time: '19:30',
    category: 'Concerts',
    price: 899,
    rating: 4.5,
    totalSeats: 400,
    availableSeats: 400,
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Sur Sangam Foundation',
    tags: ['classical', 'fusion', 'music']
  },
  {
    title: 'Delhi Diwali Food & Craft Mela',
    description: 'A festive mela with regional sweets, handmade decor stalls, and a diya-lighting ceremony.',
    city: 'Delhi',
    venue: 'Dilli Haat, INA',
    date: daysFromNow(40),
    time: '16:00',
    category: 'Festivals',
    price: 0,
    rating: 4.7,
    totalSeats: 5000,
    availableSeats: 5000,
    image: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Delhi Tourism Board',
    tags: ['diwali', 'free entry', 'family']
  },
  {
    title: 'Mumbai Craft Beer & Live Jazz Evening',
    description: 'A rooftop evening pairing small-batch craft beer flights with a live jazz trio.',
    city: 'Mumbai',
    venue: 'Bandra Rooftop Lounge',
    date: daysFromNow(10),
    time: '19:00',
    category: 'Food',
    price: 1299,
    rating: 4.5,
    totalSeats: 120,
    availableSeats: 120,
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    organiser: 'Bandra Craft Collective',
    tags: ['jazz', 'craft beer', 'rooftop']
  }
];

const run = async () => {
  await connectDB();

  // --- Admin user ---
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tripshare.in').toLowerCase();
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 10);
    admin = await User.create({
      fullName: process.env.ADMIN_NAME || 'Admin User',
      email: adminEmail,
      phone: process.env.ADMIN_PHONE || '9999999999',
      city: process.env.ADMIN_CITY || 'Delhi',
      password: hashed,
      role: 'admin'
    });
    console.log(`Admin created: ${adminEmail} / ${process.env.ADMIN_PASSWORD || 'Admin@12345'}`);
  } else {
    console.log('Admin already exists, skipping creation.');
  }

  // --- Sample events (only seed if the collection is empty) ---
  const eventCount = await Event.countDocuments();
  if (eventCount === 0) {
    const withCreator = sampleEvents.map((e) => ({ ...e, createdBy: admin._id }));
    await Event.insertMany(withCreator);
    console.log(`${withCreator.length} sample events inserted.`);
  } else {
    console.log(`Events collection already has ${eventCount} document(s), skipping sample insert.`);
  }

  console.log('Seed complete.');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
