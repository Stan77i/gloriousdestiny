#!/usr/bin/env node
// Vérifie la connexion au projet Supabase avec la clé PUBLIQUE de .env.local,
// et que les règles d'accès refusent bien les lectures interdites.
// Usage : npm run check:supabase
import { readFileSync, existsSync } from 'node:fs'

function lireEnvLocal() {
  const env = { ...process.env }
  if (existsSync('.env.local')) {
    for (const ligne of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in process.env)) env[m[1]] = m[2]
    }
  }
  return env
}

const env = lireEnvLocal()
const url = env.VITE_SUPABASE_URL
const cle = env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !cle) {
  console.log('Identifiants Supabase non configurés (.env.local) : vérification ignorée.')
  process.exit(0)
}

const entetes = { apikey: cle, Authorization: `Bearer ${cle}` }
async function lire(chemin) {
  const reponse = await fetch(`${url}/rest/v1/${chemin}`, { headers: entetes })
  return { statut: reponse.status, corps: await reponse.json().catch(() => null) }
}

const verifications = [
  [
    'villes lisibles',
    async () => {
      const r = await lire('villes?select=nom&order=ordre')
      return r.statut === 200 && Array.isArray(r.corps) && r.corps.length > 0
        ? `${r.corps.map((v) => v.nom).join(', ')}`
        : null
    },
  ],
  [
    'stock non lisible par une visiteuse',
    async () => {
      const r = await lire('stocks?select=*')
      return r.statut === 401 || r.statut === 403 || r.statut === 404
        ? `refusé (HTTP ${r.statut})`
        : null
    },
  ],
  [
    'commandes non lisibles par une visiteuse',
    async () => {
      const r = await lire('commandes?select=*')
      return r.statut === 401 || r.statut === 403 || r.statut === 404
        ? `refusé (HTTP ${r.statut})`
        : null
    },
  ],
  [
    'paramètres privés masqués',
    async () => {
      const r = await lire('parametres?select=cle')
      const cles = Array.isArray(r.corps) ? r.corps.map((p) => p.cle) : []
      return r.statut === 200 && !cles.includes('delai_expiration_reservation_heures')
        ? `${cles.length} paramètres publics`
        : null
    },
  ],
]

let echecs = 0
for (const [nom, verifier] of verifications) {
  try {
    const resultat = await verifier()
    if (resultat) console.log(`OK   ${nom} : ${resultat}`)
    else {
      echecs++
      console.error(`ECHEC ${nom}`)
    }
  } catch (e) {
    echecs++
    console.error(`ECHEC ${nom} : ${e.message}`)
  }
}
process.exit(echecs ? 1 : 0)
