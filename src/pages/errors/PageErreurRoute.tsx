import { isRouteErrorResponse, useRouteError } from 'react-router'
import { versErreurApp } from '@/lib/errors/versErreurApp'
import { PageIntrouvable } from './PageIntrouvable'

/** Erreur inattendue pendant le rendu ou le chargement d'une route. */
export function PageErreurRoute() {
  const erreur = useRouteError()
  if (isRouteErrorResponse(erreur) && erreur.status === 404) return <PageIntrouvable />

  console.error(erreur)
  const message = versErreurApp(erreur).message

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xs tracking-[0.4em] text-or uppercase">Glorious Destiny</p>
      <h1 className="text-2xl font-light">Un problème est survenu.</h1>
      <p className="text-sm text-ivoire/70">{message}</p>
      <button
        type="button"
        onClick={() => {
          window.location.reload()
        }}
        className="min-h-11 border border-ivoire/30 px-5 text-sm hover:border-or hover:text-or"
      >
        Recharger la page
      </button>
    </main>
  )
}
