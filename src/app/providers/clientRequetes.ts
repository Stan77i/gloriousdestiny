import { QueryCache, QueryClient } from '@tanstack/react-query'
import { versErreurApp } from '@/lib/errors/versErreurApp'

/** Pas de nouvel essai sur une erreur définitive (droits, validation, introuvable). */
const CODES_DEFINITIFS = new Set([
  'acces_refuse',
  'validation',
  'introuvable',
  'configuration',
  'non_connecte',
])

export function creerClientRequetes(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (erreur) => {
        console.error('Requête en échec', versErreurApp(erreur).detail ?? erreur)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (tentatives, erreur) =>
          tentatives < 2 && !CODES_DEFINITIFS.has(versErreurApp(erreur).code),
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
}
