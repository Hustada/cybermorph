'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useQueue, QueueItem } from '@/context/QueueContext'

export default function ConversionQueue() {
  const { state, removeItem, clearCompleted, processQueue } = useQueue()

  const handleDownload = (item: QueueItem) => {
    if (item.result) {
      const url = window.URL.createObjectURL(item.result)
      const a = document.createElement('a')
      a.href = url
      a.download = `cybermorph_${item.file.name.split('.')[0]}.${item.targetFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }
  }

  if (state.items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-cyber-black/90 backdrop-blur-md border-t border-cyber-cyan/20">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-cyber-cyan flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
            Conversion Queue
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => processQueue()}
              disabled={state.isProcessing}
              className={`px-4 py-2 rounded bg-gradient-to-r from-cyber-cyan to-cyber-magenta
                hover:shadow-neon-cyan transition-all ${
                  state.isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              Process Queue
            </button>
            <button
              onClick={clearCompleted}
              className="px-4 py-2 rounded border border-gray-600 hover:border-cyber-magenta 
                hover:text-cyber-magenta transition-all"
            >
              Clear Completed
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {state.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-cyber-charcoal/50 rounded p-3 flex items-center gap-4"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm truncate">{item.file.name}</span>
                    <div className="flex items-center gap-2">
                      {item.status === 'completed' && item.result && (
                        <button
                          onClick={() => handleDownload(item)}
                          className="p-1 rounded-full hover:text-cyber-cyan transition-colors"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded-full hover:text-cyber-magenta transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="h-1 bg-cyber-black rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${
                        item.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-cyber-cyan to-cyber-magenta'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">
                      {item.status === 'pending' && 'Pending...'}
                      {item.status === 'processing' && 'Processing...'}
                      {item.status === 'completed' && 'Completed'}
                      {item.status === 'error' && (
                        <span className="text-red-400">{item.error}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(item.file.size / 1024).toFixed(2)} KB →{' '}
                      {item.targetFormat.toUpperCase()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
