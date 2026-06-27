import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('par_token')
    if (!token) { setLoading(false); return }
    api.me()
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('par_token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(username, password) {
    const { token, user: u } = await api.login(username, password)
    localStorage.setItem('par_token', token)
    setUser(u)
  }

  function logout() {
    localStorage.removeItem('par_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
