import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { NotificationsProvider } from '@/components/feedback/notifications/NotificationsProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { creerClientRequetes } from './clientRequetes'

/** Fournisseurs globaux : données (React Query), session, notifications. */
export function Fournisseurs({ children }: { children: ReactNode }) {
  const [clientRequetes] = useState(creerClientRequetes)
  return (
    <QueryClientProvider client={clientRequetes}>
      <AuthProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
