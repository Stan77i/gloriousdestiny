#!/usr/bin/env node
// Vérifie qu'aucune clé secrète n'est présente dans le code versionné ni dans le build (dist/).
// Usage : node scripts/check-secrets.mjs
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MOTIFS = [
  { nom: 'clé secrète Supabase', re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { nom: 'variable service_role', re: /SERVICE_ROLE_KEY\s*=\s*\S+/i },
  { nom: 'clé privée', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { nom: 'jeton GitHub', re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { nom: 'mot de passe Postgres en URL', re: /postgres(ql)?:\/\/[^:\s]+:[^@\s]+@/ },
]

function jwtServiceRole(texte) {
  const jetons = texte.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []
  return jetons.some((j) => {
    try {
      return (
        JSON.parse(Buffer.from(j.split('.')[1], 'base64url').toString()).role === 'service_role'
      )
    } catch {
      return false
    }
  })
}

function fichiersDist(dossier) {
  if (!existsSync(dossier)) return []
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom)
    return statSync(chemin).isDirectory() ? fichiersDist(chemin) : [chemin]
  })
}

// Fichiers suivis + nouveaux fichiers non ignorés (ce qui serait commité).
const versionnes = execSync('git ls-files --cached --others --exclude-standard', {
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => f && !f.startsWith('.claude/') && !/\.(png|jpe?g|webp|avif|ico)$/i.test(f))
const fichiers = [...versionnes, ...fichiersDist('dist')]

const problemes = []
for (const fichier of fichiers) {
  if (fichier === 'scripts/check-secrets.mjs' || !existsSync(fichier)) continue
  const texte = readFileSync(fichier, 'utf8')
  for (const { nom, re } of MOTIFS) if (re.test(texte)) problemes.push(`${fichier} : ${nom}`)
  if (jwtServiceRole(texte)) problemes.push(`${fichier} : jeton service_role`)
}

const envVersionne = versionnes.filter(
  (f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith('.env.example'),
)
for (const f of envVersionne) problemes.push(`${f} : fichier .env versionné`)

if (problemes.length > 0) {
  console.error('Secrets détectés :\n' + problemes.map((p) => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log(`Aucun secret détecté (${fichiers.length} fichiers analysés).`)
