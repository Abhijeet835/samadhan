// SAMPLE DATA — replace with verified official contacts before any real use.
// No real officials' emails or individual officer names are included.
import mongoose from 'mongoose';

import { connectDB, disconnectDB } from '../config/db.js';
import Authority from '../modules/authorities/authority.model.js';
import { normaliseCity } from '../modules/authorities/authority.service.js';
import { guardDemoSeed } from './seedGuard.util.js';

guardDemoSeed();

const SAMPLE_AUTHORITIES = [
  {
    nameEn: 'Bengaluru Roads & Infrastructure Cell (SAMPLE)',
    nameHi: 'बेंगलुरु सड़क एवं अवसंरचना प्रकोष्ठ (नमूना)',
    department: 'Roads & Infrastructure',
    categories: ['BROKEN_ROADS', 'PUBLIC_FACILITIES'],
    cityKeys: ['bengaluru', 'bangalore'],
    email: 'grievance.roads.bengaluru@example.org',
    handles: { x: '@sample_blr_roads', facebook: 'sample.blr.roads', instagram: '@sample_blr_roads' },
    website: 'https://example.org/bengaluru-roads',
  },
  {
    nameEn: 'Bengaluru Solid Waste Management Cell (SAMPLE)',
    nameHi: 'बेंगलुरु ठोस अपशिष्ट प्रबंधन प्रकोष्ठ (नमूना)',
    department: 'Solid Waste Management',
    categories: ['GARBAGE_MANAGEMENT', 'SEWAGE_DRAINAGE'],
    cityKeys: ['bengaluru', 'bangalore'],
    email: 'grievance.waste.bengaluru@example.org',
    handles: { x: '@sample_blr_waste' },
    website: 'https://example.org/bengaluru-waste',
  },
  {
    nameEn: 'Mumbai Water Supply Grievance Cell (SAMPLE)',
    nameHi: 'मुंबई जल आपूर्ति शिकायत प्रकोष्ठ (नमूना)',
    department: 'Water Supply',
    categories: ['WATER_ELECTRICITY', 'SEWAGE_DRAINAGE'],
    cityKeys: ['mumbai', 'bombay'],
    email: 'grievance.water.mumbai@example.org',
    handles: { x: '@sample_mum_water', facebook: 'sample.mum.water' },
    website: 'https://example.org/mumbai-water',
  },
  {
    nameEn: 'Mumbai Roads & Traffic Cell (SAMPLE)',
    nameHi: 'मुंबई सड़क एवं यातायात प्रकोष्ठ (नमूना)',
    department: 'Roads & Traffic',
    categories: ['BROKEN_ROADS', 'PUBLIC_FACILITIES', 'WATER_ELECTRICITY'],
    cityKeys: ['mumbai', 'bombay'],
    email: 'grievance.roads.mumbai@example.org',
    handles: {},
    website: 'https://example.org/mumbai-roads',
  },
  {
    nameEn: 'Delhi Municipal Services Cell (SAMPLE)',
    nameHi: 'दिल्ली नगरपालिका सेवा प्रकोष्ठ (नमूना)',
    department: 'Municipal Services',
    categories: ['*'],
    cityKeys: ['delhi', 'new delhi'],
    email: 'grievance.municipal.delhi@example.org',
    handles: { x: '@sample_del_municipal', instagram: '@sample_del_municipal' },
    website: 'https://example.org/delhi-municipal',
  },
  {
    nameEn: 'National Civic Grievance Fallback (SAMPLE)',
    nameHi: 'राष्ट्रीय नागरिक शिकायत फ़ॉलबैक (नमूना)',
    department: 'Civic Grievance Redressal',
    categories: ['*'],
    cityKeys: ['*'],
    email: 'grievance.fallback@example.org',
    handles: { x: '@sample_civic_fallback' },
    website: 'https://example.org/civic-fallback',
    isFallback: true,
  },
];

async function seed() {
  await connectDB();
  for (const sample of SAMPLE_AUTHORITIES) {
    const cityKeys = sample.cityKeys.map(normaliseCity);
    await Authority.updateOne(
      { nameEn: sample.nameEn, cityKeys },
      { $setOnInsert: { ...sample, cityKeys } },
      { upsert: true },
    );
  }
  console.log(`[seed] ${SAMPLE_AUTHORITIES.length} sample authorities ensured (idempotent).`);
  await disconnectDB();
}

seed().catch(async (error) => {
  console.error('[seed] Failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
