import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface PageTitleContextValue {
  title: string
  onBack?: () => void
  setPage: (title: string, onBack?: () => void) => void
}

const PageTitleContext = createContext<PageTitleContextValue>({
  title: '',
  onBack: undefined,
  setPage: () => {},
})

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('')
  const [onBack, setOnBack] = useState<(() => void) | undefined>(undefined)

  function setPage(newTitle: string, newOnBack?: () => void) {
    setTitle(newTitle)
    setOnBack(newOnBack ? () => newOnBack : undefined)
  }

  return (
    <PageTitleContext.Provider value={{ title, onBack, setPage }}>
      {children}
    </PageTitleContext.Provider>
  )
}

export function usePageTitle() {
  return useContext(PageTitleContext)
}

export function useSetPage(title: string, onBack?: () => void) {
  const { setPage } = useContext(PageTitleContext)

  useEffect(() => {
    setPage(title, onBack)
    return () => setPage('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title])
}
