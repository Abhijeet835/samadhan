import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../modules/users/user.model.js';

const SALT_ROUNDS = 10;

/**
 * Seed admin user
 * Creates or updates the admin account with credentials from .env
 */
async function seedAdmin() {
  try {
    console.log('[seed] Connecting to MongoDB...');
    await connectDB();

    const adminEmail = env.adminEmail;
    const adminPassword = env.adminPassword;

    if (!adminEmail || !adminPassword) {
      console.error(
        '[seed] ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env',
      );
      process.exit(1);
    }

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log(`[seed] Admin user already exists: ${adminEmail}`);
      console.log('[seed] Updating admin credentials...');

      // Update password
      admin.password = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      admin.role = 'ADMIN';
      admin.isActive = true;
      await admin.save();

      console.log('[seed] ✓ Admin credentials updated');
    } else {
      console.log('[seed] Creating new admin user...');

      // Create new admin
      admin = await User.create({
        name: 'Admin',
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, SALT_ROUNDS),
        phone: '9999999999', // Placeholder admin phone
        role: 'ADMIN',
        language: 'en',
        activeMode: 'GLOBAL',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      });

      console.log('[seed] ✓ Admin user created');
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  Admin Credentials');
    console.log('═══════════════════════════════════════');
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('═══════════════════════════════════════');
    console.log('');

    console.log('[seed] Admin seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[seed] Admin seeding failed:', error);
    process.exit(1);
  }
}

// Run seed if executed directly
seedAdmin();
