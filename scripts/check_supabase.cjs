/**
 * Supabase Connection Diagnostics Script
 * Validates .env configuration and tests network ping against Supabase API.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.resolve(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
const envVars = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      envVars[key] = val;
    }
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL || '';
const anonKey = envVars.VITE_SUPABASE_ANON_KEY || '';

console.log('----------------------------------------------------');
console.log('📡 FleetMind Supabase Connection Diagnostic');
console.log('----------------------------------------------------');

const isPlaceholder = !supabaseUrl || 
  supabaseUrl.includes('your-project') || 
  !anonKey || 
  anonKey.includes('your-actual');

if (isPlaceholder) {
  console.log('⚠️ Status: Supabase credentials in .env are still placeholders.');
  console.log('   URL:', supabaseUrl || '(empty)');
  console.log('   Anon Key:', anonKey ? `${anonKey.substring(0, 10)}...` : '(empty)');
  console.log('\n👉 To connect: Provide your Supabase Project URL and Anon Key.');
  process.exit(0);
}

try {
  const parsed = new URL(supabaseUrl);
  console.log(`✅ Project Host: ${parsed.hostname}`);
  console.log(`✅ Key Format: ${anonKey.substring(0, 12)}... (Length: ${anonKey.length})`);
  
  if (anonKey.includes('service_role')) {
    console.error('❌ SECURITY ERROR: VITE_SUPABASE_ANON_KEY contains service_role key!');
    process.exit(1);
  }

  // Probe Supabase Health Endpoint
  const healthUrl = `${supabaseUrl}/auth/v1/health`;
  const req = https.get(healthUrl, { headers: { 'apikey': anonKey } }, (res) => {
    console.log(`✅ Connection Response: HTTP ${res.statusCode}`);
    if (res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 403) {
      console.log('🎉 Successfully reached Supabase project endpoint!');
    } else {
      console.log(`ℹ️ Received status: ${res.statusCode}`);
    }
    process.exit(0);
  });

  req.on('error', (err) => {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  });
  
  req.setTimeout(5000, () => {
    req.destroy();
    console.error('❌ Connection timed out after 5000ms');
    process.exit(1);
  });
} catch (e) {
  console.error('❌ Invalid URL format:', e.message);
  process.exit(1);
}
