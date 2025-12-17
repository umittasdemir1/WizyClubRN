require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables'); // Custom RPC?

    // If no RPC, try information_schema
    if (error) {
        console.log('RPC failed, trying query...');
        const { data: tables, error: e2 } = await supabase
            .from('videos') // Just to check connection
            .select('count');
        console.log('Connection check:', e2 ? 'FAIL' : 'OK');

        // Listing tables generally requires postgres access or specific RPC
        // Let's just check the 'videos' table again with NO filters.
        const { data: all, error: e3 } = await supabase.from('videos').select('*');
        console.log('All videos count:', all?.length);
    } else {
        console.log('Tables:', data);
    }
}
listTables();
