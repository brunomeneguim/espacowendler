-- ── Add DDI columns to pacientes ─────────────────────────────────────────────
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS ddi_telefone_1    TEXT DEFAULT '+55',
  ADD COLUMN IF NOT EXISTS ddi_telefone_2    TEXT DEFAULT '+55',
  ADD COLUMN IF NOT EXISTS responsavel_ddi   TEXT DEFAULT '+55',
  ADD COLUMN IF NOT EXISTS parceiro_ddi      TEXT DEFAULT '+55';
