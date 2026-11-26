// SAMPLE DATA — service providers ONLY (NO retail shops, bakeries, or stationery)
// across all 9 real-world service categories (5 verified per category = 45 + 2 pending = 47)
// spanning 14 Indian cities/states, PLUS 8 verified service providers clustered around
// BIT Mesra / PMC, Ranchi (835215) so the nearby marketplace is demoable.
// Phones 9000000001..9000000060.
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

// 5 distinct providers per each of the 9 service-only LOCAL_CATEGORIES = 45 verified providers
const PROVIDERS_BY_CATEGORY = {
  CAB_AUTO: [
    { name: 'Ramesh Auto & Cab Travels', price: 24900, hint: 'From ₹249 / ride' },
    { name: 'Metro City Cab & Airport Drop', price: 39900, hint: 'From ₹399 / trip' },
    { name: 'Yatra Express Auto & Taxi', price: 19900, hint: 'From ₹199 local ride' },
    { name: 'GreenWheel Electric Auto Fleet', price: 17900, hint: 'From ₹179 / drop' },
    { name: 'CityLine Intercity Cabs', price: 49900, hint: 'From ₹499 half-day' },
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
  GARAGE_MECHANIC: [
    { name: 'Shakti Auto Garage & Mechanics', price: 39900, hint: 'From ₹399 inspection' },
    { name: 'Highway Motors & Bike Repair', price: 29900, hint: 'From ₹299 tune-up' },
    { name: 'Precision Wheel & Dent Workshop', price: 49900, hint: 'From ₹499 full check' },
    { name: 'Royal Two-Wheeler Service Hub', price: 24900, hint: 'From ₹249 oil service' },
    { name: 'Battery & Jumpstart Roadside Care', price: 34900, hint: '24x7 dispatch ₹349+' },
  ],
  HOUSE_CLEANING: [
    { name: 'CleanSpace Home Deep Cleaning', price: 59900, hint: 'From ₹599 / home' },
    { name: 'SparkleBath & Kitchen Sanitizing', price: 44900, hint: 'From ₹449 deep wash' },
    { name: 'ShieldGuard Pest & Termite Care', price: 69900, hint: 'From ₹699 spray' },
    { name: 'PureTank Overhead Water Tank Wash', price: 39900, hint: 'Tank scrub ₹399+' },
    { name: 'SofaVac Carpet & Mattress Spa', price: 49900, hint: 'From ₹499 dry foam' },
  ],
  CARPENTER: [
    { name: 'Vishwakarma Carpentry & Furniture', price: 39900, hint: 'From ₹399 repair' },
    { name: 'SafeKey Locksmith & Door Latch Fix', price: 24900, hint: 'Lock unlock ₹249+' },
    { name: 'WoodCraft Modular Kitchen & Hinges', price: 49900, hint: 'From ₹499 visit' },
    { name: 'ShutterFix Aluminium & Mesh Work', price: 34900, hint: 'Window mesh ₹349+' },
    { name: 'Artisan Wardrobe & Bed Assembly', price: 44900, hint: 'Assembly ₹449+' },
  ],
  PAINTER: [
    { name: 'Rangoli Wall Painters & Polish', price: 69900, hint: 'Room quote ₹699+' },
    { name: 'AquaSeal Damp & Terrace Waterproofing', price: 79900, hint: 'Inspection ₹799+' },
    { name: 'FinishTouch Putty & Texture Craft', price: 59900, hint: 'Per wall ₹599+' },
    { name: 'FreshCoat Rental Move-Out Painting', price: 89900, hint: 'Express pack ₹899+' },
    { name: 'WoodGlow Enamel & Grill Painting', price: 49900, hint: 'Gate/grill ₹499+' },
  ],
  PACKERS_MOVERS: [
    { name: 'Sahayak Home & Shifting Services', price: 99900, hint: 'From ₹999 local move' },
    { name: 'SafeTransit Packers & Tempo Care', price: 119900, hint: 'Mini tempo ₹1,199+' },
    { name: 'EasyShift Hostel & PG Luggage Move', price: 59900, hint: 'Hostel shift ₹599+' },
    { name: 'ProLoad Appliances & Furniture Shifting', price: 89900, hint: '2 helpers ₹899+' },
    { name: 'CityHop Office & Desk Relocation', price: 149900, hint: 'Team quote ₹1,499+' },
  ],
  OTHER_LOCAL: [
    { name: 'GreenThumb Lawn & Garden Care', price: 34900, hint: 'Garden trim ₹349+' },
    { name: 'IronWeld Balcony Grill & Gate Welding', price: 39900, hint: 'On-site weld ₹399+' },
    { name: 'SolarWash Rooftop Panel Cleaning', price: 29900, hint: 'Per kW ₹299+' },
    { name: 'QuickCourier Local Document Runner', price: 19900, hint: 'Pickup/drop ₹199+' },
    { name: 'SafeNet CCTV Camera Install & Tune', price: 49900, hint: 'Camera check ₹499+' },
  ],
};

const BIOS = [
  'Verified neighbourhood service provider offering transparent upfront pricing, timely arrival, and quality workmanship.',
  'Experienced local technician and service specialist serving nearby homes and commuters with dependable scheduled visits.',
  'Trusted community service provider with verified skills, clear upfront rates, and live booking updates.',
];

// Verified demo service listings around BIT Mesra campus and PMC, Ranchi (service-only — no shops/bakery/stationery).
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
    name: 'Vashnavi Auto Service',
    displayName: 'Vashnavi Auto Garage — BIT Road, Mesra',
    category: 'GARAGE_MECHANIC',
    price: 39900,
    hint: 'From ₹399 inspection',
    lng: 85.4325,
    lat: 23.4146,
    address: 'BIT Road, Mesra, Ranchi',
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
    displayName: 'CoolCare AC & Appliance Tech — PMC Colony',
    category: 'APPLIANCE_REPAIR',
    price: 37900,
    hint: 'From ₹379 checkup',
    lng: 85.4401,
    lat: 23.4162,
    address: 'PMC Colony, Mesra, Ranchi',
  },
  {
    name: 'Mesra CleanSpace Home Care',
    displayName: 'Mesra CleanSpace Deep Cleaning — BIT Mesra',
    category: 'HOUSE_CLEANING',
    price: 49900,
    hint: 'From ₹499 / deep clean',
    lng: 85.4395,
    lat: 23.418,
    address: 'Campus Residential Road, BIT Mesra, Ranchi',
  },
  {
    name: 'Kanke Road Carpenter & Locksmith',
    displayName: 'Kanke Road Carpenter & Locksmith — Mesra',
    category: 'CARPENTER',
    price: 29900,
    hint: 'From ₹299 / lock or latch',
    lng: 85.4411299,
    lat: 23.4118828,
    address: 'Mesra South Gate Road, Ranchi',
  },
  {
    name: 'Ranchi Wall Painters & Seal',
    displayName: 'Ranchi Wall Painters & Waterproofing — BIT Road',
    category: 'PAINTER',
    price: 59900,
    hint: 'Per room ₹599+',
    lng: 85.4358414,
    lat: 23.416672,
    address: 'BIT Road, Mesra, Ranchi',
  },
  {
    name: 'CampusShift Hostel Packers',
    displayName: 'CampusShift Packers & Movers — Kanke Road',
    category: 'PACKERS_MOVERS',
    price: 59900,
    hint: 'Hostel & home shift ₹599+',
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
  // Ensure legacy shop/bakery/stationery sample listings are never left behind on re-seed
  await Helper.deleteMany({
    isSample: true,
    $or: [
      { categories: { $in: ['GENERAL_STORE', 'SWEETS_BAKERY'] } },
      { displayName: /Bakery|Mithai|Halwai|OvenCrust|General Store|Kirana|Ration|Provision|Supermarket|Campus Mart|PSS Mart|Xerox|Stationery/i },
    ],
  });

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
