-- Valor de aluguel de sala configurável por profissional
ALTER TABLE profissionais
  ADD COLUMN IF NOT EXISTS valor_aluguel_sala NUMERIC(10,2) NOT NULL DEFAULT 50;

-- Campos de pagamento em agendamentos
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS pago               BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS forma_pagamento    TEXT,
  ADD COLUMN IF NOT EXISTS valor_sessao       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS aluguel_cobrado    BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aluguel_valor      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS falta_marcada_em   TIMESTAMPTZ;

-- Flag para permitir que secretária veja o módulo financeiro
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS secretaria_ver_financeiro BOOLEAN NOT NULL DEFAULT FALSE;
