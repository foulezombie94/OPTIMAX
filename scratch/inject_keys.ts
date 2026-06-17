import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const dummyKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1+2mR2tC..."; // Just a placeholder string, doesn't need to be a valid RSA key if we only test the UI, but wait! The crypto.ts might try to import it!
// Let's generate a real RSA-OAEP public key using Node.js crypto module and export it as spki base64.
import crypto from 'crypto';

async function main() {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  
  const spkiDer = publicKey.export({
    type: 'spki',
    format: 'der'
  });
  
  const base64Key = spkiDer.toString('base64');

  const { data, error } = await supabase
    .from('profiles')
    .update({ public_key: base64Key })
    .is('public_key', null);
    
  console.log("Updated profiles with dummy keys", error);
}

main();
