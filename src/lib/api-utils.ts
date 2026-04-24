import { getAuthFromCookies, SessionPayload } from './auth';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Helper to get the current session and ensure user is authenticated.
 * Returns the session or throws an error.
 */
export async function getSessionOrThrow(): Promise<SessionPayload> {
  const session = await getAuthFromCookies();
  if (!session) {
    throw new Error('Não autorizado');
  }
  return session;
}

/**
 * Applies a corretor_id filter to a Supabase query if the user is not an admin.
 * @param query The Supabase query builder
 * @param session The current user session
 * @param fieldName The name of the field to filter by (default: 'corretor_id')
 */
export function applyRoleFilter(
  query: any,
  session: SessionPayload,
  fieldName: string = 'corretor_id'
) {
  if (session.app_role === 'admin') {
    return query;
  }
  
  if (!session.corretor_id) {
     // If they are a broker but have no ID, they shouldn't see anything or should see nulls
     return query.eq(fieldName, '00000000-0000-0000-0000-000000000000'); 
  }

  return query.eq(fieldName, session.corretor_id);
}
