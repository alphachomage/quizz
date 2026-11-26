/* global Env */
// api/admin.ts — contrôle d'accès admin (GET /api/admin/check).
import { json, jsonError } from './http.js';
import { exigerAdmin } from './session.js';

// --- Accès admin : GET /api/admin/check (header Authorization: Bearer <token>) ->
// 200 { ok, admin: true } si le compte DU TOKEN a admin = 1 en table `comptes`,
// 401 sans session valide, 403 si compte non admin. Le flag vit EN BASE (colonne
// comptes.admin, migration 0003), pas dans une var d'env : aucun secret dans
// wrangler.toml. Le pseudo n'est pas pris en paramètre : il vient du token, un client
// ne peut pas tester les pseudos des autres.
// Promotion d'un compte (bootstrap du 1er admin) :
//   npx wrangler d1 execute voltquiz --remote --command \
//     "UPDATE comptes SET admin = 1 WHERE pseudo_normalise = 'tonpseudo'" ---
export async function routeAdminCheck(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return jsonError('Méthode non supportée.', 405);
  const a = await exigerAdmin(request, env);
  if (a instanceof Response) return a;
  return json({
    ok: true,
    admin: true,
  });
}
