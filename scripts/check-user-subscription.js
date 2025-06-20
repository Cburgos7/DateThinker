require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkUserSubscription() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    
    console.log('Using service role key for admin access...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Check the user with the correct UUID
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, subscription_status, subscription_expiry, stripe_customer_id')
      .eq('id', 'e98da408-ca36-4b92-8132-a15e7d34ef57');
    
    if (error) {
      console.error('Error fetching user by ID:', error);
      
      // Try fetching by email as backup
      console.log('Trying to fetch by email instead...');
      const { data: usersByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('id, email, subscription_status, subscription_expiry, stripe_customer_id')
        .eq('email', 'burgoschris7@gmail.com');
      
      if (emailError) {
        console.error('Error fetching user by email:', emailError);
        return;
      }
      
      if (usersByEmail && usersByEmail.length > 0) {
        console.log('✅ Found user by email:', usersByEmail[0]);
        return;
      } else {
        console.log('❌ User not found by email either');
        return;
      }
    }
    
    if (users && users.length > 0) {
      console.log('✅ Found user by ID:', users[0]);
    } else {
      console.log('❌ User not found with that ID');
      
      // Try fetching by email as backup
      console.log('Trying to fetch by email instead...');
      const { data: usersByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('id, email, subscription_status, subscription_expiry, stripe_customer_id')
        .eq('email', 'burgoschris7@gmail.com');
      
      if (emailError) {
        console.error('Error fetching user by email:', emailError);
        return;
      }
      
      if (usersByEmail && usersByEmail.length > 0) {
        console.log('✅ Found user by email:', usersByEmail[0]);
      } else {
        console.log('❌ User not found by email either');
        
        // List all profiles to see what we have
        console.log('Checking all profiles in database...');
        const { data: allProfiles, error: allError } = await supabase
          .from('profiles')
          .select('id, email, subscription_status, stripe_customer_id')
          .limit(10);
        
        if (allError) {
          console.error('Error fetching all profiles:', allError);
        } else {
          console.log('All profiles in database:', allProfiles);
        }
      }
    }
  } catch (error) {
    console.error('Error in checkUserSubscription:', error);
  }
}

checkUserSubscription(); 