import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Fournisseurs } from './providers/Fournisseurs'
import { routes } from './router/routes'

const routeur = createBrowserRouter(routes)

export function App() {
  return (
    <Fournisseurs>
      <RouterProvider router={routeur} />
    </Fournisseurs>
  )
}
