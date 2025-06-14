require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function findUserUuid() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Find the user with email burgoschris7@gmail.com
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'burgoschris7@gmail.com');
    
    if (error) {
      console.error('Error fetching user:', error);
      
      // If that fails, let's look at the complete UUID from the Supabase screenshot
      console.log('\n📋 From your Supabase screenshot, I can see the user ID should be:');
      console.log('e98da408-ca36-4b92-8f32-a15e7f4b (this appears to be incomplete)');
      console.log('\n💡 The correct complete UUID should be exactly 36 characters with 5 groups:');
      console.log('XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX');
      console.log('\nLooking at your screenshot, the full UUID is likely:');
      console.log('e98da408-ca36-4b92-8f32-a15e7f4b****');
      console.log('\n🔍 Please check your Supabase dashboard to get the complete UUID');
      return;
    }
    
    if (users && users.length > 0) {
      const user = users[0];
      console.log('✅ Found user:');
      console.log('Complete UUID:', user.id);
      console.log('Email:', user.email);
      console.log('\nUse this UUID in your test scripts!');
    } else {
      console.log('❌ User not found with that email');
      console.log('\n💡 Based on your Supabase screenshot, try using one of these complete UUIDs:');
      console.log('00b0b444-5a16-475b-953b-5425... (ngable1995@gmail.com)');
      console.log('38c3cfff-c8ba-48cb-a81b-bc4621... (cwczapper77@gmail.com)');
      console.log('6e0fc9ee-17ea-44f6-9c09-69b82... (ahaddad123@gmail.com)');
      console.log('bec9be25-73bd-482c-ad16-cfcd8... (jillianslater02@gmail.com)');
      console.log('e98da408-ca36-4b92-8f32-a15e7... (burgoschris7@gmail.com) - INCOMPLETE');
      console.log('\n🔍 Please click on your user row in Supabase to see the complete UUID');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findUserUuid(); 