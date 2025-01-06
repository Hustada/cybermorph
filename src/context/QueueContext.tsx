'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { logger } from '@/utils/logger'

interface ConversionResult {
  url?: string
  data?: string
  format?: string
  size?: number
  width?: number
  height?: number
}

export interface QueueItem {
  id: string
  file: File | Blob | string
  targetFormat: string
  quality: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress?: number
  error?: string
  result?: ConversionResult
  previewUrl?: string
  s3Key?: string
}

interface QueueState {
  items: QueueItem[]
  error?: string
}

type QueueAction =
  | { type: 'ADD_ITEMS'; payload: QueueItem[] }
  | { type: 'UPDATE_ITEM'; payload: Partial<QueueItem> & { id: string } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RETRY_ITEM'; payload: { id: string; quality?: number } }

const MAX_QUEUE_SIZE = 5
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024 // 100MB

const initialState: QueueState = {
  items: [],
}

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'ADD_ITEMS':
      return {
        ...state,
        items: [...state.items, ...action.payload].slice(0, MAX_QUEUE_SIZE),
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
      }
    case 'CLEAR_QUEUE':
      return {
        ...state,
        items: [],
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
    case 'RETRY_ITEM':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                status: 'pending',
                error: undefined,
                quality: action.payload.quality || item.quality,
              }
            : item
        ),
      }
    default:
      return state
  }
}

const isLargeFile = (file: File | Blob | string): boolean => {
  if (typeof file === 'string') return false
  return file.size > LARGE_FILE_THRESHOLD
}

// Force new build - 2025-01-05
export const QueueContext = createContext<{
  state: QueueState
  addItems: (files: { file: File; targetFormat: string; quality?: number }[]) => void
  removeItem: (id: string) => void
  clearQueue: () => void
  retryItem: (id: string, quality?: number) => void
  processQueue: () => Promise<void>
} | null>(null)

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(queueReducer, initialState)

  const updateItem = useCallback((update: Partial<QueueItem> & { id: string }) => {
    dispatch({ type: 'UPDATE_ITEM', payload: update })
  }, [])

  const updateItemStatus = useCallback((
    id: string, 
    status: QueueItem['status'], 
    error?: string
  ) => {
    updateItem({ 
      id, 
      status, 
      error,
      ...(status === 'processing' ? { progress: 0 } : {})
    })
  }, [updateItem])

  const updateItemResult = useCallback((
    id: string, 
    result: ConversionResult
  ) => {
    updateItem({ id, result })
  }, [updateItem])

  const processItem = useCallback(async (item: QueueItem) => {
    try {
      let fileData: File | Blob
      if (item.file instanceof File || item.file instanceof Blob) {
        fileData = item.file
      } else {
        throw new Error('Unsupported file type')
      }

      logger.info('Starting item processing', { 
        fileName: item.file instanceof File ? item.file.name : 'unknown',
        format: item.targetFormat,
        isLarge: isLargeFile(fileData)
      })

      updateItemStatus(item.id, 'processing')
      
      const formData = new FormData()
      formData.append('file', fileData)
      formData.append('format', item.targetFormat)
      formData.append('quality', item.quality.toString())

      let response: Response
      
      if (isLargeFile(fileData)) {
        logger.info('Processing large file', { fileName: item.file instanceof File ? item.file.name : 'unknown' })
        if (!item.s3Key) {
          throw new Error('Missing S3 key for large file')
        }
        
        response = await fetch('/api/process-large', {
          method: 'POST',
          body: JSON.stringify({
            key: item.s3Key,
            format: item.targetFormat,
            quality: item.quality,
          }),
        })
      } else {
        logger.info('Processing regular file', { fileName: item.file instanceof File ? item.file.name : 'unknown' })
        response = await fetch('/api/convert', {
          method: 'POST',
          body: formData,
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        logger.error('Processing failed', { 
          fileName: item.file instanceof File ? item.file.name : 'unknown',
          status: response.status,
          error: errorData 
        })
        throw new Error(errorData.error || 'Failed to process file')
      }

      const result = await response.json()
      logger.success('Processing completed', { 
        fileName: item.file instanceof File ? item.file.name : 'unknown',
        format: result.format,
        size: result.size 
      })
      
      updateItemResult(item.id, result)
      updateItemStatus(item.id, 'completed')
      
    } catch (error) {
      logger.error('Processing error', { 
        fileName: item.file instanceof File ? item.file.name : 'unknown',
        error 
      })
      updateItemStatus(item.id, 'error', error instanceof Error ? error.message : 'Unknown error')
    }
  }, [updateItemStatus, updateItemResult])

  const processQueue = useCallback(async () => {
    const pendingItems = state.items.filter(item => item.status === 'pending')
    for (const item of pendingItems) {
      await processItem(item)
    }
  }, [state.items, processItem])

  const addItems = useCallback((
    files: { file: File; targetFormat: string; quality?: number }[]
  ) => {
    const newItems: QueueItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file: file.file,
      targetFormat: file.targetFormat,
      quality: file.quality || 80,
      status: 'pending',
      previewUrl: URL.createObjectURL(file.file),
    }))

    dispatch({ type: 'ADD_ITEMS', payload: newItems })
  }, [])

  const removeItem = useCallback((id: string) => {
    const item = state.items.find(item => item.id === id)
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }, [state.items])

  const clearQueue = useCallback(() => {
    state.items.forEach(item => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
    dispatch({ type: 'CLEAR_QUEUE' })
  }, [state.items])

  const retryItem = useCallback((id: string, quality?: number) => {
    dispatch({ type: 'RETRY_ITEM', payload: { id, quality } })
  }, [])

  const value = {
    state,
    addItems,
    removeItem,
    clearQueue,
    retryItem,
    processQueue,
  }

  return (
    <QueueContext.Provider value={value}>
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
