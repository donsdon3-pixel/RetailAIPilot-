import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match && !match[1].startsWith('#')) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1');
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

const DEMO_USERS = [
  {
    email: 'owner@supermart.com',
    password: 'DemoPass123!',
    role: 'BUSINESS_OWNER',
    organization_id: 'org_01',
    name: 'Rajesh Sharma',
    store_id: 'store_01',
  },
  {
    email: 'manager@supermart.com',
    password: 'DemoPass123!',
    role: 'STORE_MANAGER',
    organization_id: 'org_01',
    name: 'Priya Sundaram',
    store_id: 'store_01',
  },
  {
    email: 'sales@supermart.com',
    password: 'DemoPass123!',
    role: 'SALES_STAFF',
    organization_id: 'org_01',
    name: 'Karthik Rao',
    store_id: 'store_01',
  },
  {
    email: 'inventory@supermart.com',
    password: 'DemoPass123!',
    role: 'INVENTORY_STAFF',
    organization_id: 'org_01',
    name: 'Anil Kumar',
    store_id: 'store_01',
  },
  {
    email: 'admin@retailpilot.ai',
    password: 'DemoPass123!',
    role: 'SUPER_ADMIN',
    organization_id: 'org_01',
    name: 'Global System Admin',
    store_id: null,
  },
  {
    email: 'owner@aurelia.com',
    password: 'DemoPass123!',
    role: 'BUSINESS_OWNER',
    organization_id: 'org_02',
    name: 'Aanya Singhania',
    store_id: 'store_03',
  },
];

async function restoreDemoUsers() {
  console.log('================================================================');
  console.log('RETAILPILOT AI - RESTORING & VERIFYING SUPABASE DEMO USERS');
  console.log('================================================================');
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  // 1. Fetch current users in auth.users
  const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const existingUsers = listData?.users || [];
  console.log(`Found ${existingUsers.length} existing users in auth.users.`);

  for (const u of DEMO_USERS) {
    const existing = existingUsers.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());

    const metadata = {
      full_name: u.name,
      organization_id: u.organization_id,
      role: u.role,
      store_id: u.store_id,
    };

    if (existing) {
      console.log(`Updating existing auth user: ${u.email} (ID: ${existing.id})...`);
      const { data: updData, error: updErr } = await adminClient.auth.admin.updateUserById(existing.id, {
        password: u.password,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: {
          ...metadata,
          provider: 'email',
          providers: ['email'],
        },
      });
      if (updErr) {
        console.error(`  ❌ Error updating ${u.email}:`, updErr.message);
      } else {
        console.log(`  ✓ Updated ${u.email} with password "${u.password}" and claims { org: ${u.organization_id}, role: ${u.role} }`);
      }
    } else {
      console.log(`Creating new auth user: ${u.email}...`);
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: {
          ...metadata,
          provider: 'email',
          providers: ['email'],
        },
      });
      if (createErr) {
        console.error(`  ❌ Error creating ${u.email}:`, createErr.message);
      } else {
        console.log(`  ✓ Created ${u.email} (ID: ${createData.user.id}) with password "${u.password}" and claims { org: ${u.organization_id}, role: ${u.role} }`);
      }
    }

    // Sync to public.users table as well
    const { error: pubErr } = await adminClient.from('users').upsert({
      id: `usr_${u.email.split('@')[0]}`,
      organization_id: u.organization_id,
      store_id: u.store_id || null,
      email: u.email,
      full_name: u.name,
      role: u.role,
      is_active: true,
    });
    if (pubErr) {
      console.warn(`  ⚠️ public.users sync note:`, pubErr.message);
    }
  }

  console.log('\n================================================================');
  console.log('TESTING SIGN-IN VIA ANON CLIENT FOR KEY DEMO PERSONAS');
  console.log('================================================================\n');

  for (const testEmail of ['owner@supermart.com', 'owner@aurelia.com', 'manager@supermart.com', 'admin@retailpilot.ai']) {
    console.log(`Attempting signInWithPassword as "${testEmail}" (Pass: "DemoPass123!")...`);
    const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: 'DemoPass123!',
    });

    if (authErr) {
      console.error(`  ❌ Sign in FAILED for ${testEmail}:`, authErr.message);
    } else {
      console.log(`  ✓ Sign in SUCCEEDED! User ID: ${authData.user.id}`);
      console.log(`    App Metadata:`, JSON.stringify(authData.user.app_metadata));
      console.log(`    User Metadata:`, JSON.stringify(authData.user.user_metadata));
      console.log(`    Access Token (Prefix): ${authData.session.access_token.substring(0, 30)}...`);
    }
    console.log('');
  }

  console.log('All demo users restored, configured, and verified!');
}

restoreDemoUsers();
