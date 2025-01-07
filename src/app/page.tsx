'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpTrayIcon, BeakerIcon } from '@heroicons/react/24/outline'
import { useQueue } from '@/context/QueueContext'
import { useSound } from '@/context/SoundContext'
import ConversionQueue from '@/components/ConversionQueue'
import CyberBackground from '@/components/CyberBackground'
import Footer from '@/components/Footer'
import Welcome from '@/components/Welcome'
import SecurityWarning from '@/components/SecurityWarning'
import LoadingQueue from '@/components/LoadingQueue'
import { logger } from '@/utils/logger'
import { isLargeFile } from '@/utils/aws'

export default function Home() {
  const [targetFormat, setTargetFormat] = useState('webp')
  const [showWelcome, setShowWelcome] = useState(true)
  const [isHackingMode, setIsHackingMode] = useState(false)
  const [showHackingModeDialog, setShowHackingModeDialog] = useState(false)
  const [hackingModePassword, setHackingModePassword] = useState('')
  const [showUnauthorized, setShowUnauthorized] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30) // 30 second timer

  const { addItems, state } = useQueue()
  const { playSubmitSound, playSynthIntro4, playDropSound } = useSound()

  // Check hacking mode status on mount
  useEffect(() => {
    const checkHackingMode = async () => {
      try {
        const response = await fetch('/api/local-mode/status')
        const { isEnabled } = await response.json()
        setIsHackingMode(isEnabled)
      } catch (error) {
        console.error('Error checking hacking mode status:', error)
      }
    }
    checkHackingMode()
  }, [])

  useEffect(() => {
    if (failedAttempts >= 3) {
      setIsLocked(true)
      setShowHackingModeDialog(false)
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setFailedAttempts(0)
            setIsLocked(false)
            setTimeLeft(30)
            return 30
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [failedAttempts])

  const toggleHackingMode = async () => {
    if (isHackingMode) {
      try {
        await fetch('/api/local-mode', { method: 'DELETE' })
        setIsHackingMode(false)
      } catch (error) {
        console.error('Error disabling hacking mode:', error)
      }
    } else {
      setShowHackingModeDialog(true)
    }
  }

  const handleHackingModeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/local-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: hackingModePassword })
      })

      if (response.ok) {
        setIsHackingMode(true)
        setShowHackingModeDialog(false)
        setHackingModePassword('')
        setFailedAttempts(0)
        setTimeLeft(30)
      } else {
        const newAttempts = failedAttempts + 1
        setFailedAttempts(newAttempts)
        await playSynthIntro4()
        setShowUnauthorized(true)
        setHackingModePassword('')
        
        if (newAttempts < 3) {
          setTimeout(() => setShowUnauthorized(false), 3000)
        }
      }
    } catch (error) {
      console.error('Error enabling hacking mode:', error)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      logger.info('Files dropped', { count: acceptedFiles.length })
      playDropSound()

      // Validate files
      const validFiles = acceptedFiles.filter(file => {
        const isValid = file.type.startsWith('image/')
        if (!isValid) {
          logger.warn('Invalid file type', { fileName: file.name, type: file.type })
        }
        return isValid
      })

      if (validFiles.length === 0) {
        logger.warn('No valid files dropped')
        return
      }

      // Process each file
      const items = await Promise.all(validFiles.map(async (file) => {
        const isLarge = isLargeFile(file)
        logger.debug('Processing dropped file', { 
          fileName: file.name, 
          size: file.size, 
          isLarge 
        })

        if (isLarge) {
          // For large files, get presigned POST URL first
          logger.info('Requesting presigned POST URL', { 
            filename: file.name,
            contentType: file.type
          })
          
          const response = await fetch('/api/convert-large', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type
            })
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            logger.error('Failed to get upload URL', { 
              fileName: file.name,
              status: response.status,
              error: errorData.error
            })
            throw new Error(errorData.error || 'Failed to get upload URL')
          }

          const { url, fields, key } = await response.json()
          logger.info('Got presigned POST URL', { key })
          
          // Upload directly to S3
          logger.info('Starting S3 upload', { 
            fileName: file.name,
            key
          })

          const formData = new FormData()
          Object.entries(fields).forEach(([fieldKey, value]) => {
            formData.append(fieldKey, value as string)
          })
          formData.append('file', file)

          const uploadResponse = await fetch(url, {
            method: 'POST',
            body: formData
          })

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            logger.error('Failed to upload to S3', { 
              fileName: file.name,
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              errorDetails: errorText,
              fields: fields,
              url: url
            })
            throw new Error('Failed to upload to S3')
          }

          logger.success('Successfully uploaded to S3', { 
            fileName: file.name,
            key 
          })
          return { key, file, isLarge: true }
        } else {
          // For smaller files, use the regular convert endpoint
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            logger.error('Failed to convert file', { fileName: file.name })
            throw new Error('Failed to convert file')
          }

          return { file, isLarge: false }
        }
      }))

      // Add items to queue
      addItems(items.map(item => ({
        id: crypto.randomUUID(),
        file: item.file,
        targetFormat: targetFormat || 'webp',
        quality: 80,
        status: 'pending' as const,
        progress: 0,
        s3Key: item.key,
        useLocalProcessing: isHackingMode,
        isLarge: item.isLarge
      })))

      logger.success('Files added to queue', { count: validFiles.length })
      playSubmitSound()
    } catch (error) {
      logger.error('Error handling file drop', { error })
    }
  }, [playDropSound, targetFormat, isHackingMode, addItems, playSubmitSound])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    onDrop,
  })

  // If system is locked, only show the SecurityWarning
  if (isLocked) {
    return (
      <div className="min-h-screen">
        <CyberBackground />
        <SecurityWarning timeLeft={timeLeft} />
      </div>
    )
  }

  if (showWelcome) {
    return <Welcome onStart={() => setShowWelcome(false)} />
  }

  return (
    <div className="min-h-screen relative">
      <CyberBackground />
      
      {/* Password Dialog */}
      <AnimatePresence>
        {showHackingModeDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-cyber-black border-2 border-cyber-magenta p-6 rounded-lg shadow-lg max-w-md w-full relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyber-black px-4 text-cyber-magenta font-mono text-sm">
                {failedAttempts > 0 && (
                  <span className="flex items-center gap-2">
                    Failed Attempts: {failedAttempts}/3
                    {failedAttempts >= 3 && (
                      <span className="text-red-500">
                        Locked for {timeLeft}s
                      </span>
                    )}
                  </span>
                )}
              </div>
              
              <form onSubmit={handleHackingModeSubmit} className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-cyber-magenta mb-2">AUTHORIZATION REQUIRED</h3>
                  <p className="text-cyber-blue text-sm">Enter access code to proceed</p>
                </div>
                
                <input
                  type="password"
                  value={hackingModePassword}
                  onChange={(e) => setHackingModePassword(e.target.value)}
                  className="w-full bg-cyber-black border-2 border-cyber-magenta p-2 rounded text-cyber-magenta focus:outline-none focus:ring-2 focus:ring-cyber-blue"
                  placeholder="Enter access code"
                  disabled={failedAttempts >= 3}
                  autoFocus
                />
                
                {failedAttempts >= 3 && (
                  <motion.div 
                    className="h-1 bg-cyber-black/50 rounded overflow-hidden mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div 
                      className="h-full bg-cyber-magenta"
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: timeLeft, ease: "linear" }}
                    />
                  </motion.div>
                )}
                
                <div className="flex justify-between items-center mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHackingModeDialog(false)
                      setHackingModePassword('')
                      if (failedAttempts >= 3) {
                        setFailedAttempts(0)
                        setTimeLeft(30)
                      }
                    }}
                    className="text-cyber-blue hover:text-cyber-magenta transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={failedAttempts >= 3}
                    className="bg-cyber-magenta text-black px-4 py-2 rounded hover:bg-cyber-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unauthorized Message */}
      <AnimatePresence>
        {showUnauthorized && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-0 right-0 top-4 mx-auto w-[90%] max-w-md z-50 bg-red-950 text-red-100 p-3 rounded shadow-lg border border-red-500 text-center"
          >
            ACCESS DENIED: Invalid Authorization Code
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="relative z-10 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-cyan text-transparent bg-clip-text">
                CyberMorph
              </h1>
              <button
                onClick={toggleHackingMode}
                className={`min-w-[160px] px-4 py-2 rounded text-sm transition-all duration-300
                  ${isHackingMode 
                    ? 'bg-cyber-black text-cyber-magenta border border-cyber-magenta/30 hover:border-cyber-cyan hover:text-cyber-cyan' 
                    : 'bg-cyber-black text-cyber-cyan border border-cyber-cyan/30 hover:border-cyber-magenta hover:text-cyber-magenta'
                  }`}
              >
                {isHackingMode ? 'Disable Hacking Mode' : 'Enable Hacking Mode'}
              </button>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative mt-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/20 via-cyber-magenta/20 to-cyber-cyan/20 blur-xl" />
              <p className="text-sm md:text-base font-mono text-gray-400 relative">
                Neural Image Transformation Protocol
              </p>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-lg md:text-xl font-cyberpunk tracking-wide text-cyber-cyan mt-1 relative"
              >
                The Most Advanced Image Converter in the Galaxy
                <motion.span
                  className="absolute -right-4 top-0 text-cyber-magenta"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  _
                </motion.span>
              </motion.p>
            </motion.div>
          </div>

          {/* Upload Zone */}
          <motion.div 
            className="bg-cyber-charcoal/30 backdrop-blur-sm rounded-lg p-8 mb-8 border border-cyber-cyan/20 glow-hover"
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
                  Upload multiple files for batch processing
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Format Selection */}
          <motion.div 
            className="bg-cyber-charcoal/30 backdrop-blur-sm rounded-lg p-8 border border-cyber-magenta/20 glow-hover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <BeakerIcon className="w-5 h-5 text-cyber-cyan" />
              <span>Default Transformation Format</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Target Format</label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  className="w-full bg-cyber-black/50 border border-gray-600 rounded px-4 py-2 
                    focus:border-cyber-cyan focus:outline-none focus:shadow-neon-cyan glow-hover"
                >
                  {Object.entries({
                    webp: 'Next-gen format with superior compression and quality',
                    png: 'Lossless compression with alpha channel support',
                    jpg: 'Universal format with balanced compression',
                  }).map(([format, desc]) => (
                    <option key={format} value={format}>{format.toUpperCase()} - {desc}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Queue Component */}
          {state.isLoading ? (
            <LoadingQueue />
          ) : (
            <ConversionQueue />
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
