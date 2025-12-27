
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://snpckjrjmwxwgqcqghkl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucGNranJqbXd4d2dxY3FnaGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODQyMjQsImV4cCI6MjA4MDY2MDIyNH0.Dz-NNN4M_fZePf9EqefUkTITv6yec8KUdKNSEzv3Rw4';

const supabase = createClient(supabaseUrl, ANON_KEY);

async function checkProfileStructure() {
    console.log('Checking profile structure for: wizyclub-official');
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'wizyclub-official')
        .single();

    if (error) console.error('Error:', error);
    else console.log('Profile Data:', data);
}

checkProfileStructure();
