-- ── Tabela de lançamentos financeiros ─────────────────────────────
CREATE TABLE IF NOT EXISTS lancamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL DEFAULT 'receita'
                  CHECK (tipo IN ('receita', 'despesa')),
  valor           NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'pago', 'cancelado')),
  descricao       TEXT NOT NULL,
  forma_pagamento TEXT,
  categoria       TEXT NOT NULL DEFAULT 'outros',
  paciente_id     UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  profissional_id UUID REFERENCES profissionais(id) ON DELETE SET NULL,
  agendamento_id  UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
  observacoes     TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_lancamentos_updated_at
  BEFORE UPDATE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lancamentos_data
  ON lancamentos (data_lancamento DESC);

CREATE INDEX IF NOT EXISTS idx_lancamentos_status
  ON lancamentos (status);

ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lancamentos_select" ON lancamentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "lancamentos_insert" ON lancamentos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lancamentos_update" ON lancamentos
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lancamentos_delete" ON lancamentos
  FOR DELETE TO authenticated USING (true);

-- ── Novos itens de menu ────────────────────────────────────────────
INSERT INTO menu_config (href, label, icon_name, ordem) VALUES
  ('/financeiro', 'Financeiro', 'DollarSign', 5),
  ('/relatorios',  'Relatórios', 'BarChart2',  6)
ON CONFLICT (href) DO NOTHING;
