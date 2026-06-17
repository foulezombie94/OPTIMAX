import { createClient } from '@supabase/supabase-js';


const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log("PROFILES:", data);
  if (error) console.error("ERROR:", error);
}

main();
