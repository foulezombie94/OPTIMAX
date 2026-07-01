import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Ajout du support CORS pour que votre Dashboard sur un autre port puisse accéder à l'API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // En production, mettez l'URL de votre vrai dashboard
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

// Gère la requête de "preflight" (sécurité du navigateur pour CORS)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function isApiKeyValid(requestApiKey: string | null): boolean {
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey || !requestApiKey) return false;
  if (adminApiKey.length !== requestApiKey.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(requestApiKey), Buffer.from(adminApiKey));
  } catch (error) {
    return false;
  }
}

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key');

  if (!isApiKeyValid(apiKey)) {
    return NextResponse.json(
      { error: 'Non autorisé. Clé d\'API invalide ou manquante.' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const formattedUsers = users.users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username || 'N/A',
      created_at: user.created_at,
    }));

    return NextResponse.json({ users: formattedUsers }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("Erreur API Admin Users:", error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}
