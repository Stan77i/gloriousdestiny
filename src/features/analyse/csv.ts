/** Une cellule CSV : guillemets doublés, champ entouré si nécessaire, formules neutralisées. */
export function celluleCsv(valeur: string | number | null): string {
  if (valeur === null) return ''
  let texte = String(valeur)
  // Un tableur exécuterait « =… » : on le désamorce (injection de formule).
  if (typeof valeur === 'string' && /^[=+\-@\t\r]/.test(texte)) texte = `'${texte}`
  return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte
}

/** Fichier CSV au format attendu par Excel en français : séparateur « ; », BOM UTF-8. */
export function versCsv(entetes: string[], lignes: (string | number | null)[][]): string {
  return '﻿' + [entetes, ...lignes].map((l) => l.map(celluleCsv).join(';')).join('\r\n') + '\r\n'
}

export function telechargerCsv(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }))
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  lien.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
