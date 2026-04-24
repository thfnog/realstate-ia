import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getUsuarioByEmail, seedTestData, isMockMode } from '@/lib/mockDb';
import bcrypt from 'bcryptjs';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET && !isMockMode()) {
  throw new Error('❌ NEXTAUTH_SECRET não configurado. Defina essa variável em produção para proteger os tokens JWT.');
}
const secret = new TextEncoder().encode(NEXTAUTH_SECRET || (isMockMode() ? 'fallback-dev-secret-only-for-local-mock' : ''));

export interface SessionPayload {
  usuario_id: string;
  imobiliaria_id: string;
  email: string;
  role: string;
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
         usuario_id: isTestAdmin ? 'user-0000-admin' : 'user-0001-thiago',
         imobiliaria_id: DEFAULT_IMOBILIARIA_ID,
         email: email,
         role: isTestAdmin ? 'admin' : 'corretor',
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
  } else {
    // REAL MODE: Query Supabase
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) return null;
    user = data;
  }

  if (!user || !user.hash_senha) return null;
  
  const isValid = await bcrypt.compare(password, user.hash_senha);
  if (!isValid) return null;

  const payload: SessionPayload = {
    usuario_id: user.id,
    imobiliaria_id: user.imobiliaria_id,
    email: user.email,
    role: user.role,
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
  return verifyToken(token);
}
