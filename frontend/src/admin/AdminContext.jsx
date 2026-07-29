import { createContext, useContext, useState, useCallback } from 'react'

const AdminContext = createContext()

export function useAdmin() {
  return useContext(AdminContext)
}

export function AdminProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirm, setConfirm] = useState(null)

  const toast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const confirmAction = useCallback((title, message, onConfirm) => {
    setConfirm({ title, message, onConfirm })
  }, [])

  const closeConfirm = useCallback(() => setConfirm(null), [])

  return (
    <AdminContext.Provider value={{ toasts, toast, confirmAction, closeConfirm, confirm }}>
      {children}
    </AdminContext.Provider>
  )
}
