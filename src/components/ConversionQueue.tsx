'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, ArrowDownTrayIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useQueue, QueueItem } from '@/context/QueueContext'
import { useSound } from '@/context/SoundContext'
import NeuralProcessing from './NeuralProcessing'

export default function ConversionQueue() {
  const { state, removeItem, clearQueue } = useQueue()
  const { playDownloadSound, playSubmitSound } = useSound()
  const [showNeuralProcessing, setShowNeuralProcessing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const createPreviewUrl = useCallback((file: File | Blob | string) => {
    if (typeof file === 'string') {
      return file
    }
    return URL.createObjectURL(file)
  }, [])

  const handleDownload = async (item: QueueItem) => {
    if (!item.result) return
    
    try {
      playDownloadSound()
      
      // Get the filename
      const filename = item.file instanceof File 
        ? item.file.name.split('.')[0] 
        : 'image'
      const fullFilename = `cybermorph_${filename}.${item.targetFormat}`

      // If it's a base64 data URL
      if (item.result.data) {
        const link = document.createElement('a')
        link.href = item.result.data
        link.download = fullFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } 
      // If it's a Cloudinary URL
      else if (item.result.url) {
        // Fetch the image first
        const response = await fetch(item.result.url)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fullFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl)
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const handleDownloadAll = async () => {
    playDownloadSound()
    const completedItems = state.items.filter(item => item.status === 'completed' && item.result)
    
    // Process downloads sequentially with a delay
    for (let i = 0; i < completedItems.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay between downloads
      await handleDownload(completedItems[i])
    }
  }

  const completedCount = state.items.filter(item => item.status === 'completed').length

  useEffect(() => {
    if (isProcessing && playSubmitSound) {
      playSubmitSound()
    }
  }, [isProcessing, playSubmitSound])

  const handleNeuralComplete = useCallback(async () => {
    setIsProcessing(false)
  }, [])

  useEffect(() => {
    return () => {
      state.items.forEach(item => {
        if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [state.items])

  if (state.items.length === 0 && !state.error) return null

  return (
    <>
      <NeuralProcessing 
        isProcessing={showNeuralProcessing} 
        onComplete={() => {
          setShowNeuralProcessing(false)
          handleNeuralComplete()
        }} 
      />
      
      <div className="fixed bottom-0 left-0 right-0 bg-cyber-black/90 backdrop-blur-md border-t border-cyber-cyan/20">
        <div className="max-w-4xl mx-auto p-4">
          {/* Error Message */}
          <AnimatePresence mode="sync">
            {state.error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-red-400">
                  <ExclamationCircleIcon className="w-5 h-5" />
                  <span>{state.error}</span>
                </div>
                <button
                  onClick={() => clearQueue()}
                  className="p-1 hover:text-red-400 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h3 className="text-lg font-medium text-cyber-cyan flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
              Conversion Queue
            </h3>
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
              {completedCount > 1 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="min-w-[120px] px-3 py-2 text-sm sm:text-base rounded bg-gradient-to-r from-cyber-cyan to-cyber-magenta
                    hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2"
                  onClick={handleDownloadAll}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download All ({completedCount})
                </motion.button>
              )}
              <button
                onClick={() => {
                  setIsProcessing(true)
                  setShowNeuralProcessing(true)
                }}
                disabled={isProcessing}
                className={`min-w-[120px] px-3 py-2 text-sm sm:text-base rounded bg-gradient-to-r from-cyber-cyan to-cyber-magenta
                  hover:shadow-neon-cyan transition-all ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                Process Queue
              </button>
              <button
                onClick={clearQueue}
                className="min-w-[120px] px-3 py-2 text-sm sm:text-base rounded border border-gray-600 hover:border-cyber-magenta 
                  hover:text-cyber-magenta transition-all"
              >
                Clear Queue
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="sync">
              {state.items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-cyber-charcoal/50 rounded p-3 flex items-center gap-4 relative overflow-hidden"
                >
                  {/* Preview Image */}
                  <div className="w-12 h-12 rounded overflow-hidden bg-cyber-black/50 border border-cyber-cyan/20 flex items-center justify-center">
                    {item.file && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl || createPreviewUrl(item.file)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Success Animation Overlay */}
                  <AnimatePresence mode="sync">
                    {item.status === 'completed' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/20 to-cyber-magenta/20 pointer-events-none"
                      >
                        <motion.div
                          initial={{ x: '-100%' }}
                          animate={{ x: '200%' }}
                          transition={{ duration: 1.5, ease: "easeInOut" }}
                          className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm truncate">{item.file instanceof File ? item.file.name : 'Image'}</span>
                      <div className="flex items-center gap-2">
                        {item.status === 'completed' && item.result && (
                          <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={() => handleDownload(item)}
                            className="p-1 rounded-full hover:text-cyber-cyan transition-colors"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                          </motion.button>
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
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        {item.status === 'pending' && 'Pending...'}
                        {item.status === 'processing' && 'Processing...'}
                        {item.status === 'completed' && (
                          <>
                            <CheckCircleIcon className="w-3 h-3 text-cyber-cyan" />
                            <span className="text-cyber-cyan">Completed</span>
                          </>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-400">{item.error}</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(item.file instanceof File ? item.file.size / 1024 : 0).toFixed(2)} KB →{' '}
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
    </>
  )
}
