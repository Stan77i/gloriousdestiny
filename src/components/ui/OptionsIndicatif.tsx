import { INDICATIFS, PAYS_TELEPHONE } from '@/lib/format/telephone'

/** Options d'un menu d'indicatifs : « +237 Cameroun », etc. (pays desservis). */
export function OptionsIndicatif() {
  return (
    <>
      {INDICATIFS.map((i) => (
        <option key={i} value={i}>
          {i} {PAYS_TELEPHONE[i].pays}
        </option>
      ))}
    </>
  )
}
