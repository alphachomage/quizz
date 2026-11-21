-- migrations/0003_admin_flag.sql — flag admin SUR LE COMPTE (table comptes), pas dans
-- une var d'env : la route /api/admin/check lit cette colonne. Promotion d'un compte :
--   npx wrangler d1 execute voltquiz --remote --command \
--     "UPDATE comptes SET admin = 1 WHERE pseudo_normalise = 'tonpseudo'"
-- (en local : --local). Par défaut 0 = aucun admin.

ALTER TABLE comptes ADD COLUMN admin INTEGER NOT NULL DEFAULT 0;
