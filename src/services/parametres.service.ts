import { z } from 'zod'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { supabase } from '@/services/supabase/client'

/** Paramètres publics lus par le site (table `parametres`, colonne public = true). */
const schema = z.object({
  whatsapp_lien: z.url().nullable().default(null),
  whatsapp_numero: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/)
    .nullable()
    .default(null),
  ville_salon: z.string().min(1).nullable().default(null),
  horaires_salon: z.string().min(1).nullable().default(null),
})

export type ParametresPublics = z.infer<typeof schema>

const CLES = ['whatsapp_lien', 'whatsapp_numero', 'ville_salon', 'horaires_salon'] as const

export async function lireParametresPublics(): Promise<ParametresPublics> {
  const { data, error } = await supabase().from('parametres').select('cle, valeur').in('cle', CLES)
  if (error) throw versErreurApp(error)
  const brut = Object.fromEntries(data.map((ligne) => [ligne.cle, ligne.valeur]))
  return schema.parse(brut)
}
