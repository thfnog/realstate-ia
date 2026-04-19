import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.production.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontrados em .env.production.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Iniciando seed de produção...');

  // 1. Criar Imobiliária Padrão
  const { data: imob, error: imobError } = await supabase
    .from('imobiliarias')
    .insert([
      {
        nome_fantasia: 'JetAgency Imobiliária',
        identificador_fiscal: '00000000000',
        numero_registro: 'CRECI 12345-J',
        plano: 'premium',
        config_pais: 'BR'
      }
    ])
    .select()
    .single();

  if (imobError) {
    console.error('❌ Erro ao criar imobiliária:', imobError.message);
    return;
  }

  console.log('✅ Imobiliária criada:', imob.id);

  // 2. Criar Usuário Administrador (Você)
  // Nota: Estamos usando hash_senha simples pois o sistema MVP faz comparação direta (pode ser melhorado depois com bcrypt)
  const { data: user, error: userError } = await supabase
    .from('usuarios')
    .insert([
      {
        imobiliaria_id: imob.id,
        email: 'thfnog@gmail.com',
        hash_senha: 'admin123',
        role: 'admin'
      }
    ])
    .select()
    .single();

  if (userError) {
    console.error('❌ Erro ao criar usuário:', userError.message);
    return;
  }

  console.log('✅ Usuário administrador criado:', user.email);
  console.log('\n🚀 SEED DE PRODUÇÃO CONCLUÍDO COM SUCESSO!');
}

seed();
