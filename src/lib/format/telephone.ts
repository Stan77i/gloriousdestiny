/**
 * Pays desservis et format de leurs numéros (miroir de la table public.pays, qui fait foi
 * côté serveur). Longueur = chiffres après l'indicatif.
 */
export const PAYS_TELEPHONE = {
  '+237': {
    code: 'CM',
    pays: 'Cameroun',
    adjectif: 'camerounais',
    min: 9,
    max: 9,
    zeroRetire: false,
    exemple: '6 90 00 00 00',
  },
  '+225': {
    code: 'CI',
    pays: 'Côte d’Ivoire',
    adjectif: 'ivoirien',
    min: 10,
    max: 10,
    zeroRetire: false,
    exemple: '07 07 07 07 07',
  },
  '+241': {
    code: 'GA',
    pays: 'Gabon',
    adjectif: 'gabonais',
    min: 8,
    max: 9,
    zeroRetire: false,
    exemple: '06 12 34 56',
  },
  '+242': {
    code: 'CG',
    pays: 'Congo',
    adjectif: 'congolais',
    min: 9,
    max: 9,
    zeroRetire: false,
    exemple: '06 612 34 56',
  },
  '+221': {
    code: 'SN',
    pays: 'Sénégal',
    adjectif: 'sénégalais',
    min: 9,
    max: 9,
    zeroRetire: false,
    exemple: '77 123 45 67',
  },
  '+224': {
    code: 'GN',
    pays: 'Guinée',
    adjectif: 'guinéen',
    min: 9,
    max: 9,
    zeroRetire: false,
    exemple: '621 23 45 67',
  },
  '+1': {
    code: 'CA',
    pays: 'Canada',
    adjectif: 'canadien',
    min: 10,
    max: 10,
    zeroRetire: false,
    exemple: '514 555 01 23',
  },
  '+44': {
    code: 'GB',
    pays: 'Royaume-Uni',
    adjectif: 'britannique',
    min: 9,
    max: 10,
    zeroRetire: true,
    exemple: '07700 900123',
  },
} as const

export type Indicatif = keyof typeof PAYS_TELEPHONE
export const INDICATIFS = Object.keys(PAYS_TELEPHONE) as Indicatif[]

export function estIndicatif(v: string): v is Indicatif {
  return v in PAYS_TELEPHONE
}

/** « 9 chiffres » ou « 8 à 9 chiffres » attendus après l'indicatif. */
export function longueurAttendue(indicatif: Indicatif): string {
  const p = PAYS_TELEPHONE[indicatif]
  return p.min === p.max
    ? `${String(p.min)} chiffres`
    : `${String(p.min)} à ${String(p.max)} chiffres`
}

/**
 * Normalise un numéro saisi en E.164 pour un pays (ex. « 6 90 00 00 01 » → « +237690000001 »,
 * « 07700 900123 » → « +447700900123 »). Null si le numéro ne correspond pas au pays.
 */
export function normaliserTelephone(saisie: string, indicatif: Indicatif): string | null {
  const p = PAYS_TELEPHONE[indicatif]
  let chiffres = saisie.replace(/[\s.\-()]/g, '')
  if (chiffres.startsWith('00')) chiffres = `+${chiffres.slice(2)}`
  if (chiffres.startsWith(indicatif)) chiffres = chiffres.slice(indicatif.length)
  else if (chiffres.startsWith('+')) return null
  // Canada : « 1 514 … » saisi avec l'indicatif sans « + ».
  if (indicatif === '+1' && chiffres.length === 11 && chiffres.startsWith('1'))
    chiffres = chiffres.slice(1)
  if (p.zeroRetire && chiffres.startsWith('0')) chiffres = chiffres.slice(1)
  if (!/^\d+$/.test(chiffres) || chiffres.length < p.min || chiffres.length > p.max) return null
  return `${indicatif}${chiffres}`
}

/**
 * Numéro saisi sans pays connu (suivi d'une commande ou d'un rendez-vous) : format international
 * reconnu d'abord, sinon les pays dans l'ordre (Cameroun en premier).
 */
export function normaliserTelephoneLibre(saisie: string): string | null {
  const brut = saisie.replace(/[\s.\-()]/g, '').replace(/^00/, '+')
  if (brut.startsWith('+')) {
    // Indicatif le plus long d'abord (+237 avant +2…).
    const ind = [...INDICATIFS].sort((a, b) => b.length - a.length).find((i) => brut.startsWith(i))
    return ind ? normaliserTelephone(brut, ind) : null
  }
  for (const i of INDICATIFS) {
    const n = normaliserTelephone(brut, i)
    if (n) return n
  }
  return null
}
