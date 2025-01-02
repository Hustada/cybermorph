'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'

interface ConversionResult {
  url?: string
  data?: string
  format: string
  size: number
  width: number
  height: number
}

export interface QueueItem {
  id: string
  file: File | Blob | string
  targetFormat: string
  quality: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  result?: ConversionResult
}

interface QueueState {
  items: QueueItem[]
  error?: string
  isProcessing: boolean
}

type QueueAction =
  | { type: 'ADD_ITEMS'; items: Partial<QueueItem>[] }
  | { type: 'UPDATE_ITEM'; id: string; update: Partial<QueueItem> }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'RETRY_ITEM'; payload: { id: string; quality?: number } }

const MAX_QUEUE_SIZE = 5

const initialState: QueueState = {
  items: [],
  error: undefined,
  isProcessing: false
}

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'ADD_ITEMS': {
      const pendingItems = state.items.filter(item => item.status === 'pending')
      const availableSlots = MAX_QUEUE_SIZE - pendingItems.length
      
      if (availableSlots <= 0) {
        return {
          ...state,
          error: `Queue limit reached (max ${MAX_QUEUE_SIZE} pending items). Please wait for current items to complete.`
        }
      }

      const newItems: QueueItem[] = action.items
        .slice(0, availableSlots)
        .map(item => ({
          id: crypto.randomUUID(),
          file: item.file!,
          targetFormat: item.targetFormat || 'webp',
          quality: item.quality ?? 80,
          status: 'pending' as const,
          progress: 0
        }))

      if (action.items.length > availableSlots) {
        return {
          ...state,
          items: [...state.items, ...newItems],
          error: `Only ${availableSlots} item${availableSlots === 1 ? '' : 's'} added. Queue limit reached.`
        }
      }

      return {
        ...state,
        items: [...state.items, ...newItems],
        error: undefined
      }
    }

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.id
            ? { ...item, ...action.update }
            : item
        )
      }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.id),
        error: undefined
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: undefined
      }

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload,
      }

    case 'RETRY_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? {
                ...item,
                status: 'pending' as const,
                progress: 0,
                error: undefined,
                result: undefined,
                quality: action.payload.quality ?? item.quality ?? 80
              }
            : item
        ),
      }

    default:
      return state
  }
}

const QueueContext = createContext<{
  state: QueueState
  addItems: (files: { file: File; targetFormat: string; quality?: number }[]) => void
  updateItem: (update: Partial<QueueItem> & { id: string }) => void
  removeItem: (id: string) => void
  clearCompleted: () => void
  clearError: () => void
  processQueue: () => Promise<void>
  retryItem: (id: string, quality?: number) => void
} | null>(null)

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(queueReducer, initialState)

  const addItems = useCallback((files: { file: File; targetFormat: string; quality?: number }[]) => {
    dispatch({ type: 'ADD_ITEMS', items: files })
  }, [])

  const updateItem = useCallback((update: Partial<QueueItem> & { id: string }) => {
    dispatch({ type: 'UPDATE_ITEM', id: update.id, update })
  }, [])

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', id })
  }, [])

  const clearCompleted = useCallback(() => {
    dispatch({ type: 'UPDATE_ITEM', id: '', update: { status: 'pending' as const } })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const processItem = useCallback(async (item: QueueItem) => {
    try {
      dispatch({
        type: 'UPDATE_ITEM',
        id: item.id,
        update: { status: 'processing' as const, progress: 0 }
      })

      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('format', item.targetFormat || 'webp')
      formData.append('quality', (item.quality ?? 80).toString())

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to convert image')
      }

      const result = await response.json()
      const conversionResult: ConversionResult = {
        url: result.url,
        data: result.data,
        format: item.targetFormat,
        size: result.size || 0,
        width: result.width || 0,
        height: result.height || 0
      }

      dispatch({
        type: 'UPDATE_ITEM',
        id: item.id,
        update: {
          status: 'completed' as const,
          progress: 100,
          result: conversionResult
        }
      })
    } catch (error) {
      dispatch({
        type: 'UPDATE_ITEM',
        id: item.id,
        update: {
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }, [])

  const processQueue = useCallback(async () => {
    if (state.isProcessing) return

    dispatch({ type: 'SET_PROCESSING', payload: true })
    const pendingItems = state.items.filter((item) => item.status === 'pending')

    for (const item of pendingItems) {
      await processItem(item)
    }

    dispatch({ type: 'SET_PROCESSING', payload: false })
  }, [state.isProcessing, state.items, processItem])

  const retryItem = useCallback((id: string, quality?: number) => {
    dispatch({ type: 'RETRY_ITEM', payload: { id, quality } })
  }, [])

  return (
    <QueueContext.Provider
      value={{
        state,
        addItems,
        updateItem,
        removeItem,
        clearCompleted,
        clearError,
        processQueue,
        retryItem,
      }}
    >
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const context = useContext(QueueContext)
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider')
  }
  return context
}
