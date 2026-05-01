import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthFromCookies } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthFromCookies();
    if (!session || session.app_role !== 'master') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('configuracoes_sistema')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;
    
    // Mask sensitive fields for security
    const maskedData = { ...data };
    if (maskedData.resend_api_key) maskedData.resend_api_key = '********************************';
    if (maskedData.slack_webhook_url) maskedData.slack_webhook_url = '********************************';

    return NextResponse.json(maskedData || {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthFromCookies();
    if (!session || session.app_role !== 'master') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    
    // Only allow specific fields
    const allowedFields = [
      'resend_api_key', 
      'resend_from_email', 
      'slack_webhook_url', 
      'slack_channel'
    ];
    
    const updateData: any = { id: 1 };
    allowedFields.forEach(field => {
      // If the field is present and NOT the masked placeholder, update it
      if (body[field] !== undefined && body[field] !== '********************************') {
        updateData[field] = body[field];
      }
    });

    const { data, error } = await supabaseAdmin
      .from('configuracoes_sistema')
      .upsert(updateData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
