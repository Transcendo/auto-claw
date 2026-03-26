import { createContext, useContext, useEffect } from 'react'

export type AuthenticatedHeaderOptions = {
  actions?: React.ReactNode
  fixed?: boolean
}

type AuthenticatedHeaderContextValue = {
  setOptions: (options: AuthenticatedHeaderOptions) => void
}

export const defaultAuthenticatedHeaderOptions: AuthenticatedHeaderOptions = {
  actions: undefined,
  fixed: false,
}

export const AuthenticatedHeaderContext =
  createContext<AuthenticatedHeaderContextValue | null>(null)

export function useAuthenticatedHeader(
  options: AuthenticatedHeaderOptions = defaultAuthenticatedHeaderOptions
) {
  const context = useContext(AuthenticatedHeaderContext)

  if (!context) {
    throw new Error(
      'useAuthenticatedHeader must be used within AuthenticatedLayout'
    )
  }

  const { setOptions } = context

  useEffect(() => {
    const nextOptions = {
      actions: options.actions,
      fixed: options.fixed ?? false,
    }

    setOptions(nextOptions)

    return () => setOptions(defaultAuthenticatedHeaderOptions)
  }, [options.actions, options.fixed, setOptions])
}
