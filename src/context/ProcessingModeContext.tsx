'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface ProcessingModeContextType {
  isLocalMode: boolean
  enableLocalMode: (password: string) => Promise<void>
  disableLocalMode: () => Promise<void>
  checkLocalMode: () => Promise<void>
}

const ProcessingModeContext = createContext<ProcessingModeContextType | null>(null)

export function ProcessingModeProvider({ children }: { children: React.ReactNode }) {
  const [isLocalMode, setIsLocalMode] = useState(false)

  const checkLocalMode = useCallback(async () => {
    try {
      const response = await fetch('/api/local-mode/status')
      const { isEnabled } = await response.json()
      setIsLocalMode(isEnabled)
    } catch (error) {
      console.error('Error checking local mode:', error)
      setIsLocalMode(false)
    }
  }, [])

  const enableLocalMode = useCallback(async (password: string) => {
    const response = await fetch('/api/local-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (!response.ok) {
      const { error } = await response.json()
      throw new Error(error || 'Failed to enable local mode')
    }

    setIsLocalMode(true)
  }, [])

  const disableLocalMode = useCallback(async () => {
    await fetch('/api/local-mode', { method: 'DELETE' })
    setIsLocalMode(false)
  }, [])

  // Check local mode status on mount
  useEffect(() => {
    checkLocalMode()
  }, [checkLocalMode])

  return (
    <ProcessingModeContext.Provider
      value={{
        isLocalMode,
        enableLocalMode,
        disableLocalMode,
        checkLocalMode
      }}
    >
      {children}
    </ProcessingModeContext.Provider>
  )
}

export function useProcessingMode() {
  const context = useContext(ProcessingModeContext)
  if (!context) {
    throw new Error('useProcessingMode must be used within ProcessingModeProvider')
  }
  return context
}
