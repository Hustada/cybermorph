'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'

export interface QueueItem {
  id: string
  file: File
  targetFormat: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
  result?: Blob
}

interface QueueState {
  items: QueueItem[]
  isProcessing: boolean
  error?: string
}

type QueueAction =
  | { type: 'ADD_ITEMS'; payload: { file: File; targetFormat: string }[] }
  | { type: 'UPDATE_ITEM'; payload: Partial<QueueItem> & { id: string } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }

const MAX_QUEUE_SIZE = 5

const initialState: QueueState = {
  items: [],
  isProcessing: false,
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

      const newItems = action.payload
        .slice(0, availableSlots)
        .map(({ file, targetFormat }) => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          targetFormat,
          status: 'pending' as const,
          progress: 0,
        }))

      if (action.payload.length > availableSlots) {
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
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, ...action.payload }
            : item
        ),
      }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
        error: undefined
      }

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        items: state.items.filter(
          (item) => item.status !== 'completed' && item.status !== 'error'
        ),
        error: undefined
      }

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: undefined,
      }

    default:
      return state
  }
}

const QueueContext = createContext<{
  state: QueueState
  addItems: (files: { file: File; targetFormat: string }[]) => void
  updateItem: (update: Partial<QueueItem> & { id: string }) => void
  removeItem: (id: string) => void
  clearCompleted: () => void
  clearError: () => void
  processQueue: () => Promise<void>
} | null>(null)

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(queueReducer, initialState)

  const addItems = useCallback((files: { file: File; targetFormat: string }[]) => {
    dispatch({ type: 'ADD_ITEMS', payload: files })
  }, [])

  const updateItem = useCallback((update: Partial<QueueItem> & { id: string }) => {
    dispatch({ type: 'UPDATE_ITEM', payload: update })
  }, [])

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }, [])

  const clearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const processQueue = useCallback(async () => {
    if (state.isProcessing) return

    dispatch({ type: 'SET_PROCESSING', payload: true })
    const pendingItems = state.items.filter((item) => item.status === 'pending')

    for (const item of pendingItems) {
      try {
        dispatch({
          type: 'UPDATE_ITEM',
          payload: { id: item.id, status: 'processing', progress: 0 },
        })

        const formData = new FormData()
        formData.append('file', item.file)
        formData.append('format', item.targetFormat)

        const response = await fetch('/api/convert', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error('Conversion failed')

        const blob = await response.blob()
        dispatch({
          type: 'UPDATE_ITEM',
          payload: {
            id: item.id,
            status: 'completed',
            progress: 100,
            result: blob,
          },
        })
      } catch (error) {
        dispatch({
          type: 'UPDATE_ITEM',
          payload: {
            id: item.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    }

    dispatch({ type: 'SET_PROCESSING', payload: false })
  }, [state.isProcessing, state.items])

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
