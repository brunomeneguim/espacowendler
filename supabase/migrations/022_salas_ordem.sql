-- Adiciona coluna de ordenação às salas
ALTER TABLE salas ADD COLUMN IF NOT EXISTS ordem INT NOT NULL DEFAULT 0;

-- Popula a ordem inicial baseada na ordenação atual (ativo DESC, nome ASC)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY ativo DESC, nome ASC) - 1 AS rn
  FROM salas
)
UPDATE salas SET ordem = ranked.rn
FROM ranked
WHERE salas.id = ranked.id;
