import { useCallback, useState } from 'react'

type DialogDraftMode = 'create' | 'edit'

export type DialogDraftState<T, M = undefined> = {
  draft: T
  meta: M
  mode: DialogDraftMode
}

export function useDialogDraft<T, M = undefined>() {
  const [state, setState] = useState<DialogDraftState<T, M> | null>(null)

  const openCreate = useCallback((draft: T, meta: M) => {
    setState({
      draft,
      meta,
      mode: 'create',
    })
  }, [])

  const openEdit = useCallback((draft: T, meta: M) => {
    setState({
      draft,
      meta,
      mode: 'edit',
    })
  }, [])

  const updateDraft = useCallback((updater: T | ((current: T) => T)) => {
    setState((currentState) => {
      if (!currentState) {
        return currentState
      }

      return {
        ...currentState,
        draft:
          typeof updater === 'function'
            ? (updater as (current: T) => T)(currentState.draft)
            : updater,
      }
    })
  }, [])

  const close = useCallback(() => {
    setState(null)
  }, [])

  return {
    close,
    isOpen: state !== null,
    openCreate,
    openEdit,
    state,
    updateDraft,
  }
}
