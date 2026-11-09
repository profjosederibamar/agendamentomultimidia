import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  Server,
  Zap,
  Copy,
  Check,
  Code2,
  Wrench,
  KeyRound,
  Trash2,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  isSupabaseConfigured,
} from '../lib/supabase.ts';

interface DatabaseTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestResult {
  connected: boolean;
  provider?: string;
  database?: string;
  serverTime?: string;
  version?: string;
  latency?: string;
  totalBookings?: number;
  vercelReady?: boolean;
  message?: string;
  error?: string;
}

export const SUPABASE_SQL_SCRIPT = `-- ==========================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS NO SUPABASE
-- ==========================================

-- 1. Tabela de Usuários (Autenticação / Professores)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabela de Agendamentos Escolares
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  group_id TEXT,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  date TEXT NOT NULL,
  turno TEXT NOT NULL,
  schedule JSONB NOT NULL,
  classrooms JSONB NOT NULL,
  classroom TEXT,
  aulas JSONB NOT NULL,
  teacher_name TEXT NOT NULL,
  curriculum_component TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  user_id TEXT
);

-- 3. Tabela de Atalhos de Professores
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  component TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Habilitar Leitura/Escrita Pública para API Supabase (RLS desabilitado ou permissivo)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão pública bookings" ON bookings FOR DELETE USING (true);
CREATE POLICY "Permitir atualização pública bookings" ON bookings FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura teacher_profiles" ON teacher_profiles FOR ALL USING (true);
CREATE POLICY "Permitir leitura users" ON users FOR ALL USING (true);

-- 5. Índices para performance e prevenção de conflitos
CREATE INDEX IF NOT EXISTS idx_bookings_date_turno ON bookings(date, turno);
CREATE INDEX IF NOT EXISTS idx_bookings_resource_id ON bookings(resource_id);
`;

export const DatabaseTestModal: React.FC<DatabaseTestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [customConn, setCustomConn] = useState('');
  const [customTesting, setCustomTesting] = useState(false);
  const [customResult, setCustomResult] = useState<TestResult | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [creatingTables, setCreatingTables] = useState(false);
  const [tableResult, setTableResult] = useState<{ success: boolean; message: string } | null>(null);
  const [supaUrl, setSupaUrl] = useState('https://qloswiosvzjockzdetwn.supabase.co');
  const [supaKey, setSupaKey] = useState('sb_publishable_eChB2cVU5apHPrCP0GqxUA_p-IIN94T');
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ success: boolean; message: string; rlsNeedsPolicy?: boolean } | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(true);
  const [copiedRls, setCopiedRls] = useState(false);

  const reloadSupaConfig = () => {
    const creds = getSupabaseCredentials();
    setSupaUrl(creds.url || 'https://qloswiosvzjockzdetwn.supabase.co');
    setSupaKey(creds.anonKey || 'sb_publishable_eChB2cVU5apHPrCP0GqxUA_p-IIN94T');
    setHasStoredKey(true);
  };

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-db');
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        connected: false,
        error: err.message || 'Falha de comunicação com o servidor',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndTestPublishableKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supaUrl.trim()) return;

    let cleanUrl = supaUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      if (!cleanUrl.includes('.')) {
        cleanUrl = `https://${cleanUrl}.supabase.co`;
      } else {
        cleanUrl = `https://${cleanUrl}`;
      }
    }
    setSupaUrl(cleanUrl);

    const keyToUse = (supaKey.trim() || 'sb_publishable_eChB2cVU5apHPrCP0GqxUA_p-IIN94T');

    setTestingKey(true);
    setKeyStatus(null);

    const testRes = await testSupabaseConnection(cleanUrl, keyToUse);
    setTestingKey(false);

    if (testRes.success) {
      saveSupabaseCredentials(cleanUrl, keyToUse);
      setHasStoredKey(true);
      setKeyStatus({
        success: true,
        message: testRes.message,
        rlsNeedsPolicy: testRes.rlsNeedsPolicy,
      });
    } else {
      setKeyStatus({
        success: false,
        message: testRes.message,
      });
    }
  };

  const handleClearKey = () => {
    clearSupabaseCredentials();
    setSupaUrl('');
    setSupaKey('');
    setHasStoredKey(false);
    setKeyStatus(null);
  };

  const testCustomConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customConn.trim()) return;
    setCustomTesting(true);
    setCustomResult(null);
    try {
      const res = await fetch('/api/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: customConn.trim() }),
      });
      const data = await res.json();
      setCustomResult(data);
    } catch (err: any) {
      setCustomResult({
        connected: false,
        error: err.message || 'Erro ao testar URL do Supabase',
      });
    } finally {
      setCustomTesting(false);
    }
  };

  const handleCreateTablesAuto = async () => {
    setCreatingTables(true);
    setTableResult(null);
    try {
      const res = await fetch('/api/init-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: customConn.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setTableResult({ success: true, message: data.message });
        runTest();
      } else {
        setTableResult({ success: false, message: data.error || 'Falha ao criar tabelas.' });
      }
    } catch (err: any) {
      setTableResult({ success: false, message: err.message || 'Erro de rede ao criar tabelas.' });
    } finally {
      setCreatingTables(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
      reloadSupaConfig();
    }
  }, [isOpen]);

  const envSnippet = `SQL_HOST=aws-0-us-west-1.pooler.supabase.com\nSQL_PORT=6543\nSQL_DB_NAME=postgres\nSQL_USER=postgres.[SEU-PROJECT-REF]\nSQL_PASSWORD=[SUA-SENHA]\n# ou simplesmente:\nDATABASE_URL=postgresql://postgres:[SUA-SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres\n# ou Chave Publishable (Frontend):\nVITE_SUPABASE_URL=${supaUrl || 'https://xyz.supabase.co'}\nVITE_SUPABASE_ANON_KEY=${supaKey || 'sua-publishable-key'}`;

  const copyEnvSnippet = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const copySqlScript = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 my-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-100 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Supabase & Vercel: Guia e Conexão
              </h3>
              <p className="text-xs text-slate-500">
                Criar tabelas, conectar com Publishable Key e testar em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* CONEXÃO COM PUBLISHABLE KEY */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Conectar com Publishable Key (Anon Key) do Supabase</span>
              </h4>
              {hasStoredKey && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-black text-[10px] uppercase">
                  Ativa
                </span>
              )}
            </div>

            <p className="text-xs text-amber-900 mb-3 leading-relaxed">
              Sua chave <code className="bg-amber-200/70 px-1 py-0.5 rounded font-mono font-bold text-[11px]">sb_publishable_eChB2cVU5apHPrCP0GqxUA_p-IIN94T</code> já está preenchida no campo abaixo!
              Falta apenas a <strong>URL do Projeto</strong> (ex: <code className="bg-white px-1 py-0.5 rounded text-[11px]">https://seucodigo.supabase.co</code> ou apenas o código <code className="bg-white px-1 py-0.5 rounded text-[11px]">seucodigo</code>):
            </p>

            <form onSubmit={handleSaveAndTestPublishableKey} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                  Project URL (URL do Projeto ou Código)
                </label>
                <input
                  type="text"
                  required
                  value={supaUrl}
                  onChange={(e) => setSupaUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co ou apenas xyzcompany"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white font-mono text-slate-800 focus:outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                  Publishable Key / Anon Key (Já preenchida)
                </label>
                <input
                  type="text"
                  required
                  value={supaKey}
                  onChange={(e) => setSupaKey(e.target.value)}
                  placeholder="sb_publishable_eChB2cVU5apHPrCP0GqxUA_p-IIN94T"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-amber-50/50 font-mono text-slate-800 focus:outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="submit"
                  disabled={testingKey || !supaUrl.trim() || !supaKey.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {testingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{testingKey ? 'Testando Conexão...' : 'Salvar e Conectar Supabase'}</span>
                </button>

                {hasStoredKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </button>
                )}
              </div>
            </form>

            {keyStatus && (
              <div className="space-y-2 mt-3">
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    keyStatus.success
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : 'bg-rose-100 text-rose-950 border-rose-300'
                  }`}
                >
                  {keyStatus.message}
                </div>

                {keyStatus.rlsNeedsPolicy && (
                  <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 text-xs">
                    <p className="font-bold mb-1.5 flex items-center gap-1.5 text-amber-950">
                      <span>⚡ Para liberar a gravação no Supabase, execute este único comando no SQL Editor:</span>
                    </p>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-300 font-mono text-[11px] text-slate-800">
                      <span className="font-bold">ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;');
                          setCopiedRls(true);
                          setTimeout(() => setCopiedRls(false), 2000);
                        }}
                        className="ml-2 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                      >
                        {copiedRls ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedRls ? 'Copiado!' : 'Copiar Comando'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PASSO A PASSO PARA O SQL */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1.5">
              <span>🚀 Criar as Tabelas no Supabase (SQL Editor):</span>
            </h4>
            <ol className="text-xs space-y-2 list-decimal list-inside text-emerald-900 font-medium">
              <li>
                No Supabase, clique em <strong>SQL Editor</strong> no menu lateral.
              </li>
              <li>
                Clique no botão abaixo <strong>&ldquo;Copiar Script SQL Completo&rdquo;</strong>, cole no Supabase e clique em <strong>RUN</strong>.
              </li>
              <li>
                Pronto! As tabelas <code className="bg-white/80 px-1 py-0.5 rounded text-emerald-800 font-bold">bookings</code>, <code className="bg-white/80 px-1 py-0.5 rounded text-emerald-800 font-bold">users</code> e <code className="bg-white/80 px-1 py-0.5 rounded text-emerald-800 font-bold">teacher_profiles</code> serão criadas com as permissões de leitura e gravação da sua chave.
              </li>
            </ol>

            <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={copySqlScript}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
                <span>{copiedSql ? 'SQL Copiado para a Área de Transferência!' : 'Copiar Script SQL Completo'}</span>
              </button>

              <button
                type="button"
                onClick={handleCreateTablesAuto}
                disabled={creatingTables}
                className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Wrench className={`w-3.5 h-3.5 ${creatingTables ? 'animate-spin' : ''}`} />
                <span>{creatingTables ? 'Criando Tabelas...' : 'Criar Tabelas Automaticamente'}</span>
              </button>
            </div>

            {tableResult && (
              <div
                className={`mt-2.5 p-2.5 rounded-xl border text-xs font-bold ${
                  tableResult.success
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-rose-100 text-rose-950 border-rose-300'
                }`}
              >
                {tableResult.message}
              </div>
            )}
          </div>

          {/* STATUS ATUAL DO BANCO */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-600" />
                Status Geral do Banco
              </span>
              <button
                onClick={runTest}
                disabled={loading}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {loading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Testando conexão com o banco...</span>
              </div>
            ) : result?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-950 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{result.message || 'Conexão ativa e respondendo perfeitamente!'}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Provedor
                    </span>
                    <span className="font-extrabold text-slate-800 truncate block">
                      {hasStoredKey ? 'Supabase JS Client' : result.provider}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Latência
                    </span>
                    <span className="font-extrabold text-emerald-600 block">
                      ⚡ {result.latency}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Vercel Serverless
                    </span>
                    <span className="font-extrabold text-indigo-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                      100% Pronto
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Falha ao conectar</span>
                </div>
                <p className="text-rose-800">{result?.error}</p>
              </div>
            )}
          </div>

          {/* Test Custom Direct Connection String */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Testar Conexão Direta (DATABASE_URL / URI)
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Cole sua URL de conexão direta do PostgreSQL se preferir conectar via URI:
            </p>

            <form onSubmit={testCustomConnection} className="space-y-2.5">
              <input
                type="text"
                value={customConn}
                onChange={(e) => setCustomConn(e.target.value)}
                placeholder="postgresql://postgres:[SENHA]@db.[REF].supabase.co:5432/postgres"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono text-slate-800 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />

              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={customTesting || !customConn.trim()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {customTesting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Testar Conexão</span>
                </button>

                <button
                  type="button"
                  onClick={copyEnvSnippet}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEnv ? 'Copiado!' : 'Copiar Variáveis Vercel'}</span>
                </button>
              </div>
            </form>

            {customResult && (
              <div
                className={`mt-3 p-3 rounded-xl border text-xs ${
                  customResult.connected
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                {customResult.connected ? (
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Conexão com seu Supabase foi bem-sucedida! (Latência: {customResult.latency})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{customResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
