import { cx } from '@/lib/cx'

/** Gros bouton d'action (56 px) : `or` = lingot (ce qui rapporte), `encre` = pilule d'encre. */
export function classesCta(ton: 'or' | 'encre' = 'or') {
  return cx(
    'flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold no-underline transition-[transform,filter] duration-200 active:scale-[0.98] disabled:opacity-60',
    ton === 'or' ? 'degrade-or text-sur-or shadow-or' : 'bg-encre text-fond',
  )
}
