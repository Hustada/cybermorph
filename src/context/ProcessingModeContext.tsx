'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'

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
      if (!response.ok) {
        throw new Error('Failed to check local mode status')
      }
      const data = await response.json()
      console.log('Local mode check response:', data)
      setIsLocalMode(data.isEnabled)
    } catch (error) {
      console.error('Error checking local mode:', error)
      setIsLocalMode(false)
    }
  }, [])

  const enableLocalMode = useCallback(async (password: string) => {
    try {
      const response = await fetch('/api/local-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to enable local mode')
      }

      await checkLocalMode()
    } catch (error) {
      console.error('Error enabling local mode:', error)
      throw error
    }
  }, [checkLocalMode])

  const disableLocalMode = useCallback(async () => {
    try {
      const response = await fetch('/api/local-mode', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to disable local mode')
      }

      setIsLocalMode(false)
    } catch (error) {
      console.error('Error disabling local mode:', error)
      throw error
    }
  }, [])

  // Check local mode status on mount
  useEffect(() => {
    checkLocalMode()
  }, [checkLocalMode])

  const value = useMemo(
    () => ({
      isLocalMode,
      enableLocalMode,
      disableLocalMode,
      checkLocalMode
    }),
    [isLocalMode, enableLocalMode, disableLocalMode, checkLocalMode]
  )

  return (
    <ProcessingModeContext.Provider value={value}>
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
