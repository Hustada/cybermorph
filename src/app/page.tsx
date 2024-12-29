'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpTrayIcon, XMarkIcon, ArrowPathIcon, BeakerIcon, CpuChipIcon } from '@heroicons/react/24/outline'

const formatDescriptions = {
  webp: 'Next-gen format with superior compression and quality',
  png: 'Lossless compression with alpha channel support',
  jpg: 'Universal format with balanced compression',
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [converting, setConverting] = useState(false)
  const [targetFormat, setTargetFormat] = useState('webp')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [conversionProgress, setConversionProgress] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles[0]) {
        setFile(acceptedFiles[0])
        setPreviewUrl(URL.createObjectURL(acceptedFiles[0]))
      }
    }
  })

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(null)
    setPreviewUrl(null)
    setConversionProgress(0)
  }

  const simulateProgress = () => {
    setConversionProgress(0)
    const interval = setInterval(() => {
      setConversionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 100)
    return interval
  }

  const handleConvert = async () => {
    if (!file) return
    setConverting(true)
    const progressInterval = simulateProgress()
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('format', targetFormat)
    
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Conversion failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cybermorph_${file.name.split('.')[0]}.${targetFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error converting image:', error)
    } finally {
      clearInterval(progressInterval)
      setConversionProgress(100)
      setTimeout(() => {
        setConverting(false)
        setConversionProgress(0)
      }, 500)
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-cyber-black to-cyber-charcoal">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-block"
            animate={{ 
              textShadow: [
                "0 0 7px #00fff9",
                "0 0 10px #00fff9",
                "0 0 21px #00fff9",
                "0 0 42px #00fff9",
                "0 0 82px #00fff9",
                "0 0 92px #00fff9",
                "0 0 102px #00fff9",
                "0 0 151px #00fff9",
              ],
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyber-cyan to-cyber-magenta bg-clip-text text-transparent">
                CyberMorph
              </span>
            </h1>
          </motion.div>
          <p className="text-gray-400 text-lg mb-2">Neural Image Transformation Protocol</p>
          <div className="flex items-center justify-center gap-2 text-sm text-cyber-cyan">
            <CpuChipIcon className="w-4 h-4" />
            <span>v1.0.0</span>
          </div>
        </motion.div>
        
        {/* Upload Zone */}
        <motion.div 
          className="bg-cyber-charcoal/50 backdrop-blur-sm rounded-lg p-8 mb-8 border border-cyber-cyan/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
              ${isDragActive 
                ? 'border-cyber-cyan shadow-neon-cyan animate-pulse-cyan' 
                : 'border-gray-600 hover:border-cyber-magenta hover:shadow-neon-magenta'
              }`}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={{
                scale: isDragActive ? 1.1 : 1,
                rotate: isDragActive ? [0, 5, -5, 0] : 0,
              }}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpTrayIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-xl mb-2 font-light">
                {isDragActive
                  ? "INITIATING UPLOAD SEQUENCE..."
                  : "DRAG & DROP PROTOCOL"}
              </p>
              <p className="text-sm text-gray-400">
                Or activate manual selection
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* File Preview and Controls */}
        <AnimatePresence mode="wait">
          {file && (
            <motion.div 
              className="bg-cyber-charcoal/50 backdrop-blur-sm rounded-lg p-8 border border-cyber-magenta/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col md:flex-row gap-8">
                {/* Preview */}
                <div className="flex-1">
                  <div className="relative group">
                    {previewUrl && (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg border border-gray-700"
                      />
                    )}
                    <button
                      onClick={clearFile}
                      className="absolute top-2 right-2 p-1 rounded-full bg-cyber-black/80 text-cyber-cyan 
                        opacity-0 group-hover:opacity-100 transition-opacity hover:text-cyber-magenta"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-4 text-sm text-gray-400">
                    <p>Filename: {file.name}</p>
                    <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex-1">
                  <h3 className="text-lg mb-4 flex items-center gap-2">
                    <BeakerIcon className="w-5 h-5 text-cyber-cyan" />
                    <span>Transformation Parameters</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Target Format</label>
                      <select
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value)}
                        className="w-full bg-cyber-black border border-gray-600 rounded px-4 py-2 
                          focus:border-cyber-cyan focus:outline-none focus:shadow-neon-cyan"
                      >
                        {Object.entries(formatDescriptions).map(([format, desc]) => (
                          <option key={format} value={format}>{format.toUpperCase()} - {desc}</option>
                        ))}
                      </select>
                    </div>

                    {/* Progress Bar */}
                    {converting && (
                      <div className="mt-4">
                        <div className="h-2 bg-cyber-black rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-magenta"
                            initial={{ width: 0 }}
                            animate={{ width: `${conversionProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-center text-sm mt-2 text-cyber-cyan">
                          {conversionProgress < 100 
                            ? 'EXECUTING TRANSFORMATION...' 
                            : 'TRANSFORMATION COMPLETE'}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        onClick={handleConvert}
                        disabled={converting}
                        className={`flex-1 px-6 py-3 rounded bg-gradient-to-r from-cyber-cyan to-cyber-magenta
                          hover:shadow-neon-cyan transition-all ${converting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {converting ? (
                            <>
                              <ArrowPathIcon className="w-5 h-5 animate-spin" />
                              Processing
                            </>
                          ) : (
                            'Initialize Conversion'
                          )}
                        </span>
                      </button>
                      
                      <button
                        onClick={clearFile}
                        className="px-6 py-3 rounded border border-gray-600 hover:border-cyber-magenta 
                          hover:text-cyber-magenta transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
