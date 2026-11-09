# Passo a Passo: Supabase com Publishable Key

Você conectou com a **Publishable key** (chave anônima/pública) do Supabase! Para que ela consiga ler e gravar os agendamentos, siga estes 2 passos rápidos:

---

### Passo 1: Executar o Script no SQL Editor do Supabase
1. Abra o painel do Supabase: **[supabase.com/dashboard](https://supabase.com/dashboard)**
2. No menu lateral esquerdo, clique no ícone **SQL Editor** (`>_`).
3. Clique em **"New Query"** (Nova Consulta).
4. Cole o código abaixo e clique em **RUN**:

```sql
-- 1. Tabela de Usuários
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

-- 4. Habilitar Permissões para a Publishable Key (RLS)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão pública bookings" ON bookings FOR DELETE USING (true);
CREATE POLICY "Permitir atualização pública bookings" ON bookings FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura teacher_profiles" ON teacher_profiles FOR ALL USING (true);
CREATE POLICY "Permitir leitura users" ON users FOR ALL USING (true);

-- 5. Índices para agilidade e validação Conflito Zero
CREATE INDEX IF NOT EXISTS idx_bookings_date_turno ON bookings(date, turno);
CREATE INDEX IF NOT EXISTS idx_bookings_resource_id ON bookings(resource_id);
```

---

### Passo 2: Salvar a Chave no Aplicativo ou no Vercel

#### Opção A (Direto no Aplicativo):
1. No rodapé do aplicativo, clique em **"Testar Conexão (Supabase / Vercel)"**.
2. No primeiro card (**Conectar com Publishable Key**):
   - **Project URL:** Sua URL do Supabase (ex: `https://xyzcompany.supabase.co`)
   - **Publishable Key:** Sua chave do Supabase
3. Clique em **"Salvar e Conectar Supabase"**.

#### Opção B (No Vercel para Produção):
Nas configurações do seu projeto no Vercel (**Settings** > **Environment Variables**), adicione:
- `VITE_SUPABASE_URL`: Sua URL do Supabase (ex: `https://xyzcompany.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Sua Publishable / Anon Key
