const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspectTable() {
    console.log('=== PROFILES TABLE INSPECTION ===\n');
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        if (error) {
            console.error('Error fetching profiles:', error.message);
            return;
        }
        if (data && data.length > 0) {
            const cols = Object.keys(data[0]);
            console.log(`Total Columns: ${cols.length}\n`);
            console.log('Column Names:');
            cols.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
            console.log('\n--- First Record ---');
            for (const [key, value] of Object.entries(data[0])) {
                console.log(`  ${key}: ${JSON.stringify(value)}`);
            }
        } else {
            console.log('No records found in profiles table.');
        }
    } catch (e) {
        console.error('Execution error:', e.message);
    }
}

inspectTable();
