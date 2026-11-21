// telechargerJSON.js — déclenche le téléchargement d'un fichier JSON (export des
// questions validées, par exemple).
function downloadJson(json, fileName = 'questions-utilisateur.json') {
  const blob = new Blob([json], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
export { downloadJson };
