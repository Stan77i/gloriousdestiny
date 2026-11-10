import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Fournisseurs } from './providers/Fournisseurs'
import { routes } from './router/routes'

// basename : le site peut être servi dans un sous-dossier (GitHub Pages).
const routeur = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

export function App() {
  return (
    <Fournisseurs>
      <RouterProvider router={routeur} />
    </Fournisseurs>
  )
}
