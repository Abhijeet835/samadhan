// SAMPLE DATA — clearly dummy helpers so no real person is ever contacted.
// Phones 9000000001..9000000032, emails helperN@example.org.
// Documented demo login: helper1@example.org / Helper@12345
// Idempotent by email. 30 VERIFIED across all 9 categories + 3 pilot cities
// (same as seedAuthorities), 15 clustered within ~4 km of Bengaluru centre,
// PLUS 2 PENDING for admin-verification testing.

import bcrypt from 'bcrypt';

import { connectDB, disconnectDB } from '../config/db.js';
import User from '../modules/users/user.model.js';
import Helper from '../modules/helpers/helper.model.js';
import { ensureWallet } from '../modules/wallet/wallet.service.js';
import { LOCAL_CATEGORIES } from '../modules/helpers/helper.constants.js';

// 7.1: sample data must never reach production (unless ALLOW_DEMO_SEED=true).
import { guardDemoSeed } from './seedGuard.util.js';
guardDemoSeed();

const CITIES = [
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560001', centre: [77.5946, 12.9716] },
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001', centre: [72.8777, 19.076] },
  { city: 'Delhi', state: 'Delhi', pincode: '110001', centre: [77.209, 28.6139] },
];

const NAMES = [
  'Ramesh Kumar', 'Suresh Yadav', 'Mahesh Sharma', 'Dinesh Patel', 'Naresh Verma',
  'Ganesh Iyer', 'Rajesh Singh', 'Mukesh Gupta', 'Lokesh Reddy', 'Prakash Joshi',
  'Satish Nair', 'Harish Mehta', 'Girish Rao', 'Manoj Das', 'Sanjay Mishra',
  'Vijay Kulkarni', 'Ajay Thakur', 'Ravi Pillai', 'Kiran Desai', 'Arun Bose',
  'Sunil Pawar', 'Anil Chawla', 'Deepak Saxena', 'Vinod Bhat', 'Ashok Pandey',
  'Mohan Lal', 'Sohan Dev', 'Rohan Kapur', 'Nitin Jain', 'Pravin Shetty',
];

const BIOS = [
  'Experienced local professional serving the neighbourhood with reliable, on-time service. Available for regular and urgent work.',
  'Trusted neighbourhood service provider with years of hands-on experience. Fair pricing and clean workmanship guaranteed.',
  'Serving local homes and shops with prompt, careful service. References available from nearby residents on request.',
];

function buildHelpers() {
  const helpers = [];
  let phoneSeq = 1;
  // 30 verified: 15 Bengaluru (tight cluster), 8 Mumbai, 7 Delhi.
  const distribution = [15, 8, 7];
  let nameIndex = 0;

  distribution.forEach((count, cityIndex) => {
    const cityInfo = CITIES[cityIndex];
    for (let n = 0; n < count; n += 1) {
      const category = LOCAL_CATEGORIES[nameIndex % LOCAL_CATEGORIES.length];
      // Bengaluru cluster within ~0.03° (≈3.3 km); others spread ~0.04°.
      const spread = cityIndex === 0 ? 0.028 : 0.04;
      const angle = (n / count) * Math.PI * 2;
      const dist = 0.004 + (n / count) * spread;
      const coordinates = [
        cityInfo.centre[0] + Math.cos(angle) * dist,
        cityInfo.centre[1] + Math.sin(angle) * dist,
      ];
      helpers.push({
        email: `helper${phoneSeq}@example.org`,
        name: NAMES[nameIndex],
        phone: `90000000${String(phoneSeq).padStart(2, '0')}`,
        displayName: `${NAMES[nameIndex]} — ${category.replace(/_/g, ' ').toLowerCase()}`,
        categories: [category],
        experienceYears: 2 + (nameIndex % 18),
        bio: BIOS[nameIndex % BIOS.length],
        priceHint: `From ₹${200 + (nameIndex % 8) * 50}`,
        serviceLocation: {
          type: 'Point',
          coordinates,
          address: `Sample Street ${n + 1}, ${cityInfo.city}`,
          city: cityInfo.city,
          state: cityInfo.state,
          pincode: cityInfo.pincode,
        },
        radiusKm: 5 + (nameIndex % 11), // 5–15
        verificationStatus: 'VERIFIED',
        isSample: true,
        isAvailable: nameIndex % 4 !== 0,
      });
      phoneSeq += 1;
      nameIndex += 1;
    }
  });

  // 2 PENDING helpers for admin-verification testing.
  for (let n = 0; n < 2; n += 1) {
    helpers.push({
      email: `helper${phoneSeq}@example.org`,
      name: `Pending Sample ${n + 1}`,
      phone: `90000000${String(phoneSeq).padStart(2, '0')}`,
      displayName: `Pending Sample ${n + 1} — plumber`,
      categories: ['PLUMBER'],
      experienceYears: 1,
      bio: BIOS[n],
      priceHint: 'From ₹250',
      serviceLocation: {
        type: 'Point',
        coordinates: [77.5946 + 0.01 * (n + 1), 12.9716 + 0.01 * (n + 1)],
        address: `Sample Lane ${n + 1}, Bengaluru`,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
      radiusKm: 5,
      verificationStatus: 'PENDING',
      isSample: true,
    });
    phoneSeq += 1;
  }
  return helpers;
}

async function seed() {
  await connectDB();
  const passwordHash = await bcrypt.hash('Helper@12345', 10);
  let created = 0;
  let skipped = 0;

  for (const sample of buildHelpers()) {
    let user = await User.findOne({ email: sample.email });
    if (!user) {
      user = await User.create({
        name: sample.name,
        email: sample.email,
        phone: sample.phone,
        password: passwordHash,
        role: 'HELPER',
        language: 'en',
        activeMode: 'LOCAL',
      });
      await ensureWallet(user._id);
    }
    const existing = await Helper.findOne({ userId: user._id });
    if (existing) {
      skipped += 1;
      continue;
    }
    const { email, name, ...helperData } = sample;
    await Helper.create({ ...helperData, userId: user._id });
    created += 1;
  }

  console.log(`[seed:helpers] created=${created} skipped=${skipped} (idempotent by email).`);
  console.log('[seed:helpers] Demo login: helper1@example.org / Helper@12345');
  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed:helpers] Failed:', error.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
