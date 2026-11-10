import { useEffect } from 'react'
import { SITE } from '@/config/site'

/** Titre de l'onglet : « Page · Glorious Destiny ». */
export function useTitreDocument(titre?: string) {
  useEffect(() => {
    document.title = titre ? `${titre} · ${SITE.nom}` : SITE.nom
  }, [titre])
}
