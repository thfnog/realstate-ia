import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getUsuarioByEmail, seedTestData, isMockMode } from '@/lib/mockDb';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET && !isMockMode()) {
  throw new Error('❌ SUPABASE_JWT_SECRET não configurado. Defina essa variável em produção para os tokens JWT do Supabase RLS funcionarem.');
}
const secret = new TextEncoder().encode(JWT_SECRET || (isMockMode() ? 'fallback-dev-secret-only-for-local-mock' : ''));

export interface SessionPayload {
  usuario_id: string;
  imobiliaria_id: string;
  email: string;
  app_role: string;
  role: string; // Required by Supabase (must be 'authenticated')
  corretor_id: string | null;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  // PRAGMATIC MOCK BYPASS: Ensure test credentials always work
  if (isMockMode()) {
    seedTestData();
    const isTestAdmin = email === 'admin@imobia.com' && password === 'admin123';
    const isTestBroker = email === 'thiago@imobia.com' && password === 'admin123';

    if (isTestAdmin || isTestBroker) {
       const { DEFAULT_IMOBILIARIA_ID } = await import('@/lib/mockDb');
       return await new SignJWT({
         usuario_id: isTestAdmin ? 'user-0000-default-admin' : 'user-0001-thiago',
         imobiliaria_id: DEFAULT_IMOBILIARIA_ID,
         email: email,
         app_role: isTestAdmin ? 'admin' : 'corretor',
         role: 'authenticated',
         corretor_id: isTestAdmin ? null : 'corretor-0001-thiago',
       })
       .setProtectedHeader({ alg: 'HS256' })
       .setIssuedAt()
       .setExpirationTime('24h')
       .sign(secret);
    }
  }

  let user;

  if (isMockMode()) {
    user = getUsuarioByEmail(email);
    if (!user || !user.hash_senha) return null;
    const isValid = await bcrypt.compare(password, user.hash_senha);
    if (!isValid) return null;
  } else {
    // REAL MODE: Authenticate via Supabase Auth
    const { supabase, supabaseAdmin } = await import('@/lib/supabase');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) return null;

    // Fetch the profile from our public.usuarios table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();
    
    if (profileError || !profile) {
      // Fallback: search by email if auth_id link isn't established yet
      const { data: fallbackProfile } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();
      
      if (!fallbackProfile) return null;
      user = fallbackProfile;

      // SYNC: Se logou por email mas não tinha auth_id vinculado, vincula agora
      if (!user.auth_id) {
        await supabaseAdmin
          .from('usuarios')
          .update({ auth_id: authData.user.id })
          .eq('id', user.id);
        user.auth_id = authData.user.id;
      }
    } else {
      user = profile;
    }

    // SECURITY CHECK: If user is a broker, check if they are active
    if (user.role === 'corretor' && user.corretor_id) {
      const { data: broker } = await supabaseAdmin
        .from('corretores')
        .select('ativo')
        .eq('id', user.corretor_id)
        .single();
      
      if (broker && !broker.ativo) {
        console.warn(`🛑 Tentativa de login de corretor inativo: ${email}`);
        return null; // Block login
      }
    }
  }

  const payload: SessionPayload = {
    usuario_id: user.id,
    imobiliaria_id: user.imobiliaria_id,
    email: user.email,
    app_role: user.role,
    role: 'authenticated',
    corretor_id: user.corretor_id || null,
  };

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getAuthFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;
  
  // Backward compatibility parsing
  if (!session.app_role && session.role && session.role !== 'authenticated') {
    session.app_role = session.role;
  }
  
  return session;
}
