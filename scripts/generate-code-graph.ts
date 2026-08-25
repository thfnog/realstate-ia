#!/usr/bin/env npx tsx
/**
 * Code Graph Generator — Eager Hydration Layer
 * 
 * Usa ts-morph para analisar o AST do projeto e gerar um grafo de dependências
 * com ranking PageRank simplificado. Inspirado na arquitetura do Aider.
 * 
 * Output: .ai/code-graph.json
 * Uso: npm run graph
 * 
 * Referência: "Harnesses: Eager vs Just-in-Time" (Jordan Carson, Towards AI, 2026)
 */

import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

// ─── Configuration ───────────────────────────────────────────────────────────

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const OUTPUT_PATH = path.join(ROOT_DIR, '.ai', 'code-graph.json');
const TSCONFIG_PATH = path.join(ROOT_DIR, 'tsconfig.json');

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphNode {
  path: string;
  rank: number;
  layer: string;
  exports: string[];
  imports: string[];
  usesAI: boolean;
  type: 'module' | 'component' | 'api-route' | 'type-definition' | 'config';
  linesOfCode: number;
  description: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: 'import' | 'type-import';
}

interface HotPath {
  name: string;
  description: string;
  chain: string[];
}

interface LayerInfo {
  description: string;
  files: string[];
}

interface CodeGraph {
  generated: string;
  generator: string;
  stats: {
    totalFiles: number;
    totalEdges: number;
    totalExports: number;
    aiModules: number;
    layers: number;
  };
  layers: Record<string, LayerInfo>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  hotPaths: HotPath[];
}

// ─── Layer Classification ────────────────────────────────────────────────────

function classifyLayer(filePath: string): string {
  const rel = filePath.replace(/\\/g, '/');
  if (rel.includes('lib/engine/')) return 'engine';
  if (rel.includes('lib/repositories/')) return 'repositories';
  if (rel.includes('app/api/')) return 'api';
  if (rel.includes('components/')) return 'components';
  if (rel.includes('lib/ingest/')) return 'ingest';
  if (rel.includes('lib/whatsapp/')) return 'whatsapp';
  if (rel.includes('lib/imoveis/')) return 'imoveis-utils';
  if (rel.includes('lib/utils/')) return 'utils';
  if (rel.includes('app/') && !rel.includes('app/api/')) return 'pages';
  if (rel.includes('lib/')) return 'infrastructure';
  return 'other';
}

function classifyFileType(filePath: string, sourceFile: SourceFile): GraphNode['type'] {
  const rel = filePath.replace(/\\/g, '/');
  if (rel.includes('route.ts') || rel.includes('route.tsx')) return 'api-route';
  if (rel.endsWith('.types.ts') || rel.includes('types.ts')) return 'type-definition';
  
  // Check if it's a React component (has JSX or default export of function component)
  const hasJsx = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
                 sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
  if (hasJsx) return 'component';
  
  if (rel.includes('config')) return 'config';
  return 'module';
}

// ─── Export Extraction ───────────────────────────────────────────────────────

function extractExports(sourceFile: SourceFile): string[] {
  const exports: string[] = [];
  
  for (const [name] of sourceFile.getExportedDeclarations()) {
    exports.push(name);
  }
  
  return exports;
}

// ─── Import Extraction ───────────────────────────────────────────────────────

function extractImports(sourceFile: SourceFile): { module: string; isTypeOnly: boolean }[] {
  const imports: { module: string; isTypeOnly: boolean }[] = [];
  
  for (const imp of sourceFile.getImportDeclarations()) {
    const moduleSpec = imp.getModuleSpecifierValue();
    // Only track internal imports (starting with ./ or ../ or @/)
    if (moduleSpec.startsWith('.') || moduleSpec.startsWith('@/')) {
      imports.push({
        module: moduleSpec,
        isTypeOnly: imp.isTypeOnly(),
      });
    }
  }
  
  return imports;
}

// ─── AI Module Detection ─────────────────────────────────────────────────────

function detectAIUsage(sourceFile: SourceFile): boolean {
  const text = sourceFile.getFullText();
  return text.includes('callAIWithFallback') || 
         text.includes('GROQ_API_KEY') || 
         text.includes('OPENAI_API_KEY') ||
         text.includes('whisper');
}

// ─── Resolve Import to Relative Path ─────────────────────────────────────────

function resolveImportPath(fromFile: string, importModule: string): string | null {
  let resolved: string;
  
  if (importModule.startsWith('@/')) {
    // Alias: @/ maps to src/
    resolved = importModule.replace('@/', 'src/');
  } else if (importModule.startsWith('.')) {
    // Relative import
    const dir = path.dirname(fromFile);
    resolved = path.posix.join(dir, importModule);
  } else {
    return null; // External dependency
  }
  
  // Normalize and try common extensions
  resolved = resolved.replace(/\\/g, '/');
  
  // Remove trailing extension if present
  resolved = resolved.replace(/\.(ts|tsx|js|jsx)$/, '');
  
  return resolved;
}

function findMatchingNode(resolvedImport: string, allPaths: string[]): string | null {
  const normalized = resolvedImport.replace(/\\/g, '/');
  
  // Try exact match with extensions
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx', '/route.ts']) {
    const candidate = normalized + ext;
    const match = allPaths.find(p => p.replace(/\\/g, '/').endsWith(candidate) || 
                                     p.replace(/\\/g, '/') === candidate);
    if (match) return match;
  }
  
  return null;
}

// ─── PageRank (Simplified) ───────────────────────────────────────────────────

function computePageRank(
  nodes: string[], 
  edges: { from: string; to: string }[], 
  damping = 0.85, 
  iterations = 20
): Map<string, number> {
  const N = nodes.length;
  if (N === 0) return new Map();
  
  const rank = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const inLinks = new Map<string, string[]>();
  
  // Initialize
  for (const node of nodes) {
    rank.set(node, 1 / N);
    outDegree.set(node, 0);
    inLinks.set(node, []);
  }
  
  // Build adjacency
  for (const edge of edges) {
    if (rank.has(edge.from) && rank.has(edge.to)) {
      outDegree.set(edge.from, (outDegree.get(edge.from) || 0) + 1);
      inLinks.get(edge.to)!.push(edge.from);
    }
  }
  
  // Iterate
  for (let i = 0; i < iterations; i++) {
    const newRank = new Map<string, number>();
    
    for (const node of nodes) {
      let sum = 0;
      for (const inNode of inLinks.get(node) || []) {
        const out = outDegree.get(inNode) || 1;
        sum += (rank.get(inNode) || 0) / out;
      }
      newRank.set(node, (1 - damping) / N + damping * sum);
    }
    
    // Update ranks
    for (const [key, val] of newRank) {
      rank.set(key, val);
    }
  }
  
  return rank;
}

// ─── Generate Description ────────────────────────────────────────────────────

function generateDescription(filePath: string, exports: string[], usesAI: boolean, fileType: string): string {
  const basename = path.basename(filePath, path.extname(filePath));
  const parts: string[] = [];
  
  // Known descriptions
  const knownDescriptions: Record<string, string> = {
    'conversationEngine': 'FSM com 7 estados: greeting → qualifying → recommending → feedback → scheduling → visit_confirmed → human_handoff',
    'processLead': 'Pipeline central: Regionalização → Carteira → Plantão → IA → Matching → Briefing WhatsApp',
    'aiUtils': 'Multi-provider: OpenRouter(Llama 70B) → Groq(Llama 70B) → OpenAI(GPT-4o-mini) com logging de tokens',
    'aiExtractor': 'Extrai perfil estruturado de mensagens WhatsApp com feedback loop da tabela ai_feedback',
    'aiScheduler': 'Análise de intenção de visita e sugestão de 3 janelas livres na agenda do corretor',
    'audioTranscriber': 'Transcreve áudios WhatsApp via Groq Whisper com fallback OpenAI Whisper',
    'recommendImoveis': 'Scoring ponderado: tipo(+5) quartos(+4) orçamento±15%(+4) bairro(+3) área(+2) vagas(+1)',
    'leadClassifier': 'Classifica contato: comprador|vendedor|locatario|investidor|corretor_parceiro|proprietario|curioso',
    'dailyBriefing': 'Cron diário regionalizado (BR/PT) com resumo matinal via WhatsApp para corretores',
    'webhookProcessor': 'Processador de webhooks WhatsApp com deduplicação e roteamento para engine correto',
    'sendAutoReply': 'Resposta humanizada com delay configurável para simular digitação natural',
    'sendBriefing': 'Briefing formatado via WhatsApp para corretor com detalhes do lead e imóveis recomendados',
    'assignCorretor': 'Atribuição de corretor via escala de plantão ou round-robin fallback',
    'checkCarteira': 'Verifica se telefone já existe na carteira de algum corretor (cliente recorrente)',
    'factory': 'Instancia Mock ou Supabase Repository baseado em isMockMode()',
    'types': 'Interfaces abstratas dos 8 repositórios: Lead, Imovel, Corretor, Evento, Venda, Contrato, Parceiro, Oportunidade',
    'auth': 'JWT stateless via jose com RBAC: master|admin|corretor',
    'supabase': 'Clientes Supabase: anon (público) e supabaseAdmin (service role)',
    'whatsapp': 'Cliente Evolution API/Twilio para envio de mensagens e download de mídia',
    'billing': 'Cálculo de limites de plano, features e verificação de assinaturas',
    'countryConfig': 'Regionalização BR vs PT: Bairro/Freguesia, CRECI/AMI, R$/€, Aluguel/Arrendamento',
    'mockDb': 'Banco in-memory para desenvolvimento local sem Supabase',
    'messageFilter': 'Filtro anti-ruído via regex para ignorar mensagens sociais no WhatsApp',
  };
  
  if (knownDescriptions[basename]) {
    return knownDescriptions[basename];
  }
  
  if (usesAI) parts.push('Usa LLM');
  if (fileType === 'api-route') parts.push('API Route');
  if (fileType === 'component') parts.push('React Component');
  if (exports.length > 0) parts.push(`Exports: ${exports.slice(0, 3).join(', ')}`);
  
  return parts.join(' | ') || basename;
}

// ─── Hot Path Detection ──────────────────────────────────────────────────────

function detectHotPaths(edges: GraphEdge[], nodes: GraphNode[]): HotPath[] {
  const hotPaths: HotPath[] = [];
  
  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from)!.push(edge.to);
  }
  
  // Find chains starting from webhook routes
  const webhookEntries = nodes.filter(n => 
    n.path.includes('webhooks/') && n.type === 'api-route'
  );
  
  for (const entry of webhookEntries) {
    const chain = traceChain(entry.path, adj, new Set(), 8);
    if (chain.length > 2) {
      const name = entry.path.includes('whatsapp') 
        ? 'WhatsApp Webhook → AI Processing' 
        : `Webhook: ${path.basename(path.dirname(entry.path))}`;
      hotPaths.push({
        name,
        description: `Fluxo de entrada via ${path.basename(path.dirname(entry.path))}`,
        chain,
      });
    }
  }
  
  // Find chain through Repository Pattern
  const factoryNode = nodes.find(n => n.path.includes('repositories/factory'));
  if (factoryNode) {
    const repoFiles = nodes
      .filter(n => n.layer === 'repositories' && n.path !== factoryNode.path)
      .map(n => n.path);
    
    hotPaths.push({
      name: 'Repository Pattern',
      description: 'Acesso a dados com dual-implementation Mock/Supabase via factory',
      chain: [
        nodes.find(n => n.path.includes('repositories/types'))?.path || 'types.ts',
        factoryNode.path,
        ...repoFiles.filter(f => f.includes('Supabase')).slice(0, 3),
      ],
    });
  }
  
  // Conversation Engine chain
  const convEngine = nodes.find(n => n.path.includes('conversationEngine'));
  if (convEngine) {
    const chain = traceChain(convEngine.path, adj, new Set(), 6);
    if (chain.length > 1) {
      hotPaths.push({
        name: 'Conversation Engine (Chat Multi-Turno)',
        description: 'FSM que mantém diálogo multi-turno via WhatsApp com recomendação e agendamento',
        chain,
      });
    }
  }
  
  return hotPaths;
}

function traceChain(start: string, adj: Map<string, string[]>, visited: Set<string>, maxDepth: number): string[] {
  if (maxDepth === 0 || visited.has(start)) return [];
  visited.add(start);
  
  const chain = [start];
  const neighbors = adj.get(start) || [];
  
  // Prioritize engine/ and lib/ imports over others
  const sorted = neighbors.sort((a, b) => {
    const aEngine = a.includes('engine/') || a.includes('lib/') ? 0 : 1;
    const bEngine = b.includes('engine/') || b.includes('lib/') ? 0 : 1;
    return aEngine - bEngine;
  });
  
  for (const neighbor of sorted) {
    if (!visited.has(neighbor)) {
      const subChain = traceChain(neighbor, adj, visited, maxDepth - 1);
      chain.push(...subChain);
      break; // Follow the most important path
    }
  }
  
  return chain;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('📊 Gerando Code Graph...');
  console.log(`   Projeto: ${ROOT_DIR}`);
  console.log(`   Output:  ${OUTPUT_PATH}`);
  console.log('');
  
  // Initialize ts-morph project
  const project = new Project({
    tsConfigFilePath: TSCONFIG_PATH,
    skipAddingFilesFromTsConfig: true,
  });
  
  // Add source files
  project.addSourceFilesAtPaths([
    path.join(SRC_DIR, '**/*.ts'),
    path.join(SRC_DIR, '**/*.tsx'),
  ]);
  
  const sourceFiles = project.getSourceFiles().filter(sf => {
    const fp = sf.getFilePath().replace(/\\/g, '/');
    return !fp.includes('node_modules') && !fp.includes('.next') && fp.includes('/src/');
  });
  
  console.log(`   Encontrados ${sourceFiles.length} arquivos em src/\n`);
  
  // ─── Phase 1: Extract nodes ────────────────────────────────────────────
  
  const nodes: GraphNode[] = [];
  const allRelPaths: string[] = [];
  
  for (const sf of sourceFiles) {
    const absPath = sf.getFilePath().replace(/\\/g, '/');
    const relPath = path.relative(ROOT_DIR, absPath).replace(/\\/g, '/');
    allRelPaths.push(relPath);
    
    const exports = extractExports(sf);
    const usesAI = detectAIUsage(sf);
    const layer = classifyLayer(relPath);
    const fileType = classifyFileType(relPath, sf);
    const linesOfCode = sf.getEndLineNumber();
    
    nodes.push({
      path: relPath,
      rank: 0,
      layer,
      exports,
      imports: [],
      usesAI,
      type: fileType,
      linesOfCode,
      description: generateDescription(relPath, exports, usesAI, fileType),
    });
  }
  
  // ─── Phase 2: Extract edges ────────────────────────────────────────────
  
  const edges: GraphEdge[] = [];
  
  for (const sf of sourceFiles) {
    const absPath = sf.getFilePath().replace(/\\/g, '/');
    const relPath = path.relative(ROOT_DIR, absPath).replace(/\\/g, '/');
    const imports = extractImports(sf);
    const nodeIdx = nodes.findIndex(n => n.path === relPath);
    
    for (const imp of imports) {
      const resolved = resolveImportPath(relPath, imp.module);
      if (!resolved) continue;
      
      const targetPath = findMatchingNode(resolved, allRelPaths);
      if (targetPath) {
        edges.push({
          from: relPath,
          to: targetPath,
          type: imp.isTypeOnly ? 'type-import' : 'import',
        });
        if (nodeIdx >= 0) {
          nodes[nodeIdx].imports.push(targetPath);
        }
      }
    }
  }
  
  // ─── Phase 3: PageRank ─────────────────────────────────────────────────
  
  const ranks = computePageRank(
    nodes.map(n => n.path),
    edges
  );
  
  for (const node of nodes) {
    node.rank = Math.round((ranks.get(node.path) || 0) * 10000) / 10000;
  }
  
  // Sort by rank descending
  nodes.sort((a, b) => b.rank - a.rank);
  
  // ─── Phase 4: Detect hot paths ─────────────────────────────────────────
  
  const hotPaths = detectHotPaths(edges, nodes);
  
  // ─── Phase 5: Build layers ─────────────────────────────────────────────
  
  const layerDescriptions: Record<string, string> = {
    'engine': 'Motor Central de IA e Processamento',
    'repositories': 'Data Access Layer — Repository Pattern (Mock + Supabase)',
    'api': 'Next.js 16 API Routes (serverless)',
    'components': 'React 19 UI Components',
    'infrastructure': 'Auth, Supabase, WhatsApp, Billing, Utils',
    'pages': 'Next.js Pages e Layouts (App Router)',
    'ingest': 'Ingestão de leads via e-mail e portais',
    'whatsapp': 'Formatação de mensagens interativas WhatsApp',
    'imoveis-utils': 'Utilidades de análise de mercado imobiliário',
    'utils': 'Utilidades gerais (formatação, documentos)',
    'other': 'Outros arquivos',
  };
  
  const layers: Record<string, LayerInfo> = {};
  for (const node of nodes) {
    if (!layers[node.layer]) {
      layers[node.layer] = {
        description: layerDescriptions[node.layer] || node.layer,
        files: [],
      };
    }
    layers[node.layer].files.push(node.path);
  }
  
  // ─── Phase 6: Assemble output ──────────────────────────────────────────
  
  const graph: CodeGraph = {
    generated: new Date().toISOString(),
    generator: 'scripts/generate-code-graph.ts (ts-morph + PageRank)',
    stats: {
      totalFiles: nodes.length,
      totalEdges: edges.length,
      totalExports: nodes.reduce((sum, n) => sum + n.exports.length, 0),
      aiModules: nodes.filter(n => n.usesAI).length,
      layers: Object.keys(layers).length,
    },
    layers,
    nodes,
    edges,
    hotPaths,
  };
  
  // ─── Write output ──────────────────────────────────────────────────────
  
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(graph, null, 2), 'utf-8');
  
  // ─── Summary ───────────────────────────────────────────────────────────
  
  console.log('✅ Code Graph gerado com sucesso!\n');
  console.log('📈 Estatísticas:');
  console.log(`   Arquivos:    ${graph.stats.totalFiles}`);
  console.log(`   Arestas:     ${graph.stats.totalEdges}`);
  console.log(`   Exports:     ${graph.stats.totalExports}`);
  console.log(`   Módulos AI:  ${graph.stats.aiModules}`);
  console.log(`   Layers:      ${graph.stats.layers}`);
  console.log('');
  console.log('🏆 Top 10 arquivos por PageRank:');
  for (const node of nodes.slice(0, 10)) {
    const aiTag = node.usesAI ? ' 🤖' : '';
    console.log(`   ${node.rank.toFixed(4)} | ${node.path}${aiTag}`);
  }
  console.log('');
  console.log(`📁 Output: ${OUTPUT_PATH}`);
}

main();
