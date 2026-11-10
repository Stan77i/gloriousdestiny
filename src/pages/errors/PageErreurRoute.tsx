import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Bouton } from '@/components/ui/Bouton'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { PageIntrouvable } from './PageIntrouvable'

/** Erreur inattendue pendant le rendu ou le chargement d'une route. */
export function PageErreurRoute() {
  const erreur = useRouteError()
  if (isRouteErrorResponse(erreur) && erreur.status === 404) return <PageIntrouvable />

  console.error(erreur)
  const message = versErreurApp(erreur).message

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="titre-affiche text-[40px] text-ivoire">Un problème est survenu.</h1>
      <p className="text-sm leading-relaxed text-ivoire-2">{message}</p>
      <Bouton
        variante="secondaire"
        onClick={() => {
          window.location.reload()
        }}
      >
        Recharger la page
      </Bouton>
    </main>
  )
}
