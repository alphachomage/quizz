-- migrations/0002_sync_client.sql — nommage limpide + index réellement utiles.
--
-- 1. kv -> sync_client : la table « kv » était le miroir serveur des 17 clés
--    localStorage (blob JSON cle/valeur). « sync_client » dit ce qu'elle est :
--    les données synchronisées depuis le client, pas une base métier.
--    (SQLite conserve les index existants au renommage.)
-- 2. parties.pseudo : l'ancien index idx_parties_pseudo portait sur la colonne
--    JSON « joueurs » et était INUTILISABLE (la requête filtrolt avec
--    LIKE '%...%' — wildcard initial). On ajoute une vraie colonne texte
--    (pseudo du compte connecté au moment de la partie) et on indexe celle-là.
-- 3. Index de modération sur soumissions (filtrage par etat / theme_id côté admin).

ALTER TABLE kv RENAME TO sync_client;

ALTER TABLE parties ADD COLUMN pseudo TEXT;

DROP INDEX IF EXISTS idx_parties_pseudo;
CREATE INDEX IF NOT EXISTS idx_parties_pseudo ON parties(pseudo);

CREATE INDEX IF NOT EXISTS idx_soumissions_etat ON soumissions(etat);
CREATE INDEX IF NOT EXISTS idx_soumissions_theme ON soumissions(theme_id);
