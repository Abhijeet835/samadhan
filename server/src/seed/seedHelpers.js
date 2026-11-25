// SAMPLE DATA — clearly dummy service providers across all 7 marketplace
// categories (5 verified per category = 35 verified + 2 pending = 37) spanning
// 14 Indian cities/states, PLUS 8 verified providers clustered around
// BIT Mesra / PMC, Ranchi (835215) so the nearby marketplace is demoable.
// Phones 9000000001..9000000048.
// Primary Demo Provider login: provider@samadhan.local / Demo@12345
import bcrypt from 'bcrypt';

import { connectDB, disconnectDB } from '../config/db.js';
import User from '../modules/users/user.model.js';
import Helper from '../modules/helpers/helper.model.js';
import { ensureWallet } from '../modules/wallet/wallet.service.js';
import { LOCAL_CATEGORIES } from '../modules/helpers/helper.constants.js';
import { guardDemoSeed } from './seedGuard.util.js';

guardDemoSeed();

const LOCATIONS = [
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560001', centre: [77.5946, 12.9716] },
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001', centre: [72.8777, 19.076] },
  { city: 'New Delhi', state: 'Delhi', pincode: '110001', centre: [77.209, 28.6139] },
  { city: 'Ranchi', state: 'Jharkhand', pincode: '834001', centre: [85.3096, 23.3441] },
  { city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', centre: [80.9462, 26.8467] },
  { city: 'Jaipur', state: 'Rajasthan', pincode: '302001', centre: [75.7873, 26.9124] },
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', centre: [80.2707, 13.0827] },
  { city: 'Hyderabad', state: 'Telangana', pincode: '500001', centre: [78.4867, 17.385] },
  { city: 'Kolkata', state: 'West Bengal', pincode: '700001', centre: [88.3639, 22.5726] },
  { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', centre: [72.5714, 23.0225] },
  { city: 'Pune', state: 'Maharashtra', pincode: '411001', centre: [73.8567, 18.5204] },
  { city: 'Patna', state: 'Bihar', pincode: '800001', centre: [85.1376, 25.5941] },
  { city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001', centre: [77.4126, 23.2599] },
  { city: 'Chandigarh', state: 'Chandigarh', pincode: '160001', centre: [76.7794, 30.7333] },
];

// 5 distinct providers per each of the 7 LOCAL_CATEGORIES = 35 verified providers
const PROVIDERS_BY_CATEGORY = {
  CAB_AUTO: [
    { name: 'Ramesh Auto & Cab Travels', price: 24900, hint: 'From ₹249 / ride' },
    { name: 'Metro City Cab & Airport Drop', price: 39900, hint: 'From ₹399 / trip' },
    { name: 'Yatra Express Auto & Taxi', price: 19900, hint: 'From ₹199 local ride' },
    { name: 'GreenWheel Electric Auto Fleet', price: 17900, hint: 'From ₹179 / drop' },
    { name: 'CityLine Intercity Cabs', price: 49900, hint: 'From ₹499 half-day' },
  ],
  GENERAL_STORE: [
    { name: 'Annapurna General Store & Mart', price: 14900, hint: 'From ₹149 / order' },
    { name: 'DailyNeeds Kirana & Groceries', price: 19900, hint: 'Free delivery ₹199+' },
    { name: 'Shubham Fresh Ration & Staples', price: 24900, hint: 'Same-hour basket ₹249' },
    { name: 'Janata Provision & Dairy Store', price: 12900, hint: 'From ₹129 / bundle' },
    { name: 'Aapka Bazaar Mini Supermarket', price: 29900, hint: 'Express pack ₹299+' },
  ],
  GARAGE_MECHANIC: [
    { name: 'Shakti Auto Garage & Mechanics', price: 39900, hint: 'From ₹399 inspection' },
    { name: 'Highway Motors & Bike Repair', price: 29900, hint: 'From ₹299 tune-up' },
    { name: 'Precision Wheel & Dent Workshop', price: 49900, hint: 'From ₹499 full check' },
    { name: 'Royal Two-Wheeler Service Hub', price: 24900, hint: 'From ₹249 oil service' },
    { name: 'Battery & Jumpstart Roadside Care', price: 34900, hint: '24x7 dispatch ₹349+' },
  ],
  SWEETS_BAKERY: [
    { name: 'Mithai Mahal Sweets & Bakery', price: 29900, hint: 'From ₹299 / box' },
    { name: 'Bikaner Fresh Bakery & Mithai', price: 34900, hint: 'Custom cakes ₹349+' },
    { name: 'Kesar Bhog Pure Ghee Sweets', price: 39900, hint: 'Festive thali ₹399+' },
    { name: 'OvenCrust Artisan Breads & Cakes', price: 27900, hint: 'Fresh bakes ₹279+' },
    { name: 'Annapurna Halwai & Snacks', price: 22900, hint: 'Combo pack ₹229+' },
  ],
  PLUMBER_ELECTRICIAN: [
    { name: 'Kaveri Plumbing & Electricals', price: 34900, hint: 'From ₹349 visit' },
    { name: 'SparkFix Electricians & Plumbers', price: 29900, hint: 'From ₹299 / visit' },
    { name: 'JalSeva Pipe & Tank Specialists', price: 39900, hint: 'Leak seal ₹399+' },
    { name: 'PowerSafe MCB & Inverter Wiring', price: 32900, hint: 'Switchgear check ₹329' },
    { name: '24x7 Tap, Geyser & Motor Repair', price: 27900, hint: 'Rapid fix ₹279+' },
  ],
  APPLIANCE_REPAIR: [
    { name: 'CoolCare AC & Appliance Repair', price: 44900, hint: 'From ₹449 service' },
    { name: 'QuickFix Fridge & Washer Tech', price: 39900, hint: 'From ₹399 checkup' },
    { name: 'PureDrop RO & Chimney Service', price: 34900, hint: 'Filter clean ₹349+' },
    { name: 'SmartHome Microwave & TV Repair', price: 37900, hint: 'Diagnostics ₹379+' },
    { name: 'ChillAir Split AC Gas & Jet Wash', price: 54900, hint: 'Full AC service ₹549' },
  ],
  OTHER_LOCAL: [
    { name: 'Sahayak Home & Shifting Services', price: 49900, hint: 'From ₹499 / job' },
    { name: 'CleanSpace Home & Pest Care', price: 59900, hint: 'From ₹599 deep clean' },
    { name: 'Vishwakarma Carpentry & Furniture', price: 39900, hint: 'Custom joinery ₹399+' },
    { name: 'SafeKey Locksmith & Grill Weld', price: 24900, hint: 'Lock repair ₹249+' },
    { name: 'Rangoli Wall Painters & Waterproofing', price: 69900, hint: 'Room quote ₹699+' },
  ],
};

const BIOS = [
  'Verified neighbourhood service provider offering transparent upfront pricing, timely arrival, and quality service.',
  'Experienced local shop and technician team serving nearby homes and commuters with dependable daily support.',
  'Trusted community provider with verified service standards, clear estimates, and responsive booking updates.',
];

// Verified demo listings inside/around BIT Mesra campus and PMC, Ranchi.
// Names are based on real nearby landmarks/businesses found on OpenStreetMap
// (MS Xerox, Hot 'N' Cold, PSS Mart, Vashnavi auto service); coordinates are
// approximate sample locations for the prototype, not exact shop pins.
const BIT_MESRA_PROVIDERS = [
  {
    name: 'Mesra Campus Cab & Auto',
    displayName: 'Mesra Campus Cab & Auto — BIT Mesra',
    category: 'CAB_AUTO',
    price: 14900,
    hint: 'From ₹149 campus ride',
    lng: 85.4388,
    lat: 23.4172,
    address: 'BIT Mesra Main Gate, Mesra, Ranchi',
  },
  {
    name: 'BIT Mesra Campus Mart',
    displayName: 'BIT Mesra Campus Mart — Mesra',
    category: 'GENERAL_STORE',
    price: 12900,
    hint: 'From ₹129 / basket',
    lng: 85.4395,
    lat: 23.418,
    address: 'Campus Shopping Complex, BIT Mesra, Ranchi',
  },
  {
    name: 'Vashnavi Auto Service',
    displayName: 'Vashnavi Auto Service — BIT Road, Mesra',
    category: 'GARAGE_MECHANIC',
    price: 39900,
    hint: 'From ₹399 inspection',
    lng: 85.4325,
    lat: 23.4146,
    address: 'BIT Road, Mesra, Ranchi',
  },
  {
    name: "Hot 'N' Cold Bakery",
    displayName: "Hot 'N' Cold Bakery — Mesra South Gate",
    category: 'SWEETS_BAKERY',
    price: 24900,
    hint: 'Cakes & bakes ₹249+',
    lng: 85.4411299,
    lat: 23.4118828,
    address: 'Mesra South Gate, Ranchi',
  },
  {
    name: 'Mesra Plumbing & Electricals',
    displayName: 'Mesra Plumbing & Electricals — Kaditoli (PMC)',
    category: 'PLUMBER_ELECTRICIAN',
    price: 29900,
    hint: 'From ₹299 visit',
    lng: 85.436,
    lat: 23.4162,
    address: 'Kaditoli (PMC), Mesra, Ranchi',
  },
  {
    name: 'CoolCare Appliance Repair',
    displayName: 'CoolCare Appliance Repair — PMC Colony, Mesra',
    category: 'APPLIANCE_REPAIR',
    price: 37900,
    hint: 'From ₹379 checkup',
    lng: 85.4401,
    lat: 23.4162,
    address: 'PMC Colony, Mesra, Ranchi',
  },
  {
    name: 'MS Xerox & Stationery',
    displayName: 'MS Xerox & Stationery — BIT Road, Mesra',
    category: 'OTHER_LOCAL',
    price: 9900,
    hint: 'Print pack ₹99+',
    lng: 85.4358414,
    lat: 23.416672,
    address: 'BIT Road, Mesra, Ranchi',
  },
  {
    name: 'PSS Mart',
    displayName: 'PSS Mart — Kanke Road, Mesra',
    category: 'GENERAL_STORE',
    price: 19900,
    hint: 'Grocery delivery ₹199+',
    lng: 85.4133726,
    lat: 23.4309448,
    address: 'Kanke Road, Mesra, Ranchi',
  },
];

function buildProviders() {
  const list = [];
  let idx = 0;

  // Interleave categories across locations so every category has 5 providers in varied cities
  for (let round = 0; round < 5; round += 1) {
    for (const cat of LOCAL_CATEGORIES) {
      const template = PROVIDERS_BY_CATEGORY[cat][round];
      const loc = LOCATIONS[idx % LOCATIONS.length];
      const angle = (idx / 35) * Math.PI * 2;
      const dist = 0.004 + (idx % 6) * 0.004;
      const isPrimaryDemo = idx === 0;
      list.push({
        email: isPrimaryDemo ? 'provider@samadhan.local' : `helper${idx}@example.org`,
        name: isPrimaryDemo ? 'Demo Service Provider' : `${template.name.split(' ')[0]} Provider ${idx}`,
        phone: `90000000${String(idx + 1).padStart(2, '0')}`,
        displayName: `${template.name} — ${loc.city}`,
        categories: [cat],
        experienceYears: 2 + (idx % 14),
        bio: BIOS[idx % BIOS.length],
        priceHint: template.hint,
        basePricePaise: template.price,
        serviceLocation: {
          type: 'Point',
          coordinates: [loc.centre[0] + Math.cos(angle) * dist, loc.centre[1] + Math.sin(angle) * dist],
          address: `Market Road Sector ${(idx % 9) + 1}, ${loc.city}`,
          city: loc.city,
          state: loc.state,
          pincode: loc.pincode,
        },
        radiusKm: 12 + (idx % 10),
        verificationStatus: 'VERIFIED',
        isSample: true,
        isAvailable: idx % 7 !== 6,
      });
      idx += 1;
    }
  }

  // 2 PENDING providers for admin verification queue testing
  for (let n = 0; n < 2; n += 1) {
    const loc = LOCATIONS[n];
    const seq = idx + n + 1;
    list.push({
      email: `helper${seq}@example.org`,
      name: `Pending Provider ${n + 1}`,
      phone: `90000000${String(seq).padStart(2, '0')}`,
      displayName: `Pending Service Listing ${n + 1} (${loc.city})`,
      categories: [LOCAL_CATEGORIES[n % LOCAL_CATEGORIES.length]],
      experienceYears: 2,
      bio: BIOS[n],
      priceHint: 'From ₹299',
      basePricePaise: 29900,
      serviceLocation: {
        type: 'Point',
        coordinates: [loc.centre[0] + 0.01 * (n + 1), loc.centre[1] + 0.01 * (n + 1)],
        address: `New Shop Lane ${n + 1}, ${loc.city}`,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
      },
      radiusKm: 8,
      verificationStatus: 'PENDING',
      isSample: true,
      isAvailable: true,
    });
  }

  // 8 verified demo listings inside/around BIT Mesra & PMC, Ranchi.
  BIT_MESRA_PROVIDERS.forEach((p, n) => {
    const seq = 100 + n;
    const phoneSeq = 41 + n;
    list.push({
      email: `helper${seq}@example.org`,
      name: p.name,
      phone: `90000000${String(phoneSeq).padStart(2, '0')}`,
      displayName: p.displayName,
      categories: [p.category],
      experienceYears: 3 + (n % 8),
      bio: `${BIOS[n % BIOS.length]} Serving BIT Mesra campus, PMC and nearby Kanke Road areas.`,
      priceHint: p.hint,
      basePricePaise: p.price,
      serviceLocation: {
        type: 'Point',
        coordinates: [p.lng, p.lat],
        address: p.address,
        city: 'Ranchi',
        state: 'Jharkhand',
        pincode: '835215',
      },
      radiusKm: 20 + (n % 2) * 5,
      verificationStatus: 'VERIFIED',
      isSample: true,
      isAvailable: true,
    });
  });
  return list;
}

async function seed() {
  await connectDB();
  const demoPass = await bcrypt.hash('Demo@12345', 10);
  const legacyPass = await bcrypt.hash('Helper@12345', 10);
  let created = 0;
  let updated = 0;

  for (const item of buildProviders()) {
    const isDemo = item.email === 'provider@samadhan.local';
    let user = await User.findOne({ email: item.email });
    if (!user) {
      user = await User.create({
        name: item.name,
        email: item.email,
        phone: item.phone,
        password: isDemo ? demoPass : legacyPass,
        role: 'PROVIDER',
        activeMode: 'LOCAL',
        language: 'en',
      });
    } else if (user.role !== 'PROVIDER') {
      user.role = 'PROVIDER';
      await user.save();
    }
    await ensureWallet(user._id);

    const existing = await Helper.findOne({ userId: user._id });
    if (existing) {
      await Helper.updateOne(
        { _id: existing._id },
        {
          $set: {
            displayName: item.displayName,
            categories: item.categories,
            priceHint: item.priceHint,
            basePricePaise: item.basePricePaise,
            serviceLocation: item.serviceLocation,
            radiusKm: item.radiusKm,
            verificationStatus: item.verificationStatus,
            isHidden: false,
          },
        },
      );
      updated += 1;
    } else {
      await Helper.create({
        userId: user._id,
        displayName: item.displayName,
        phone: item.phone,
        categories: item.categories,
        experienceYears: item.experienceYears,
        bio: item.bio,
        priceHint: item.priceHint,
        basePricePaise: item.basePricePaise,
        serviceLocation: item.serviceLocation,
        radiusKm: item.radiusKm,
        verificationStatus: item.verificationStatus,
        isAvailable: item.isAvailable,
        isSample: true,
      });
      created += 1;
    }
  }

  console.log(`[seed:helpers] ${created} providers created, ${updated} updated/migrated.`);
  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed:helpers] Failed:', error.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
