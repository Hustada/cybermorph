'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpTrayIcon, BeakerIcon } from '@heroicons/react/24/outline'
import { useQueue } from '@/context/QueueContext'
import ConversionQueue from '@/components/ConversionQueue'
import CyberBackground from '@/components/CyberBackground'
import Footer from '@/components/Footer'
import Welcome from '@/components/Welcome'

export default function Home() {
  const [targetFormat, setTargetFormat] = useState('webp')
  const { addItems } = useQueue()
  const [showWelcome, setShowWelcome] = useState(true)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    onDrop: (acceptedFiles) => {
      const items = acceptedFiles.map(file => ({
        file,
        targetFormat
      }))
      addItems(items)
    }
  })

  return (
    <div className="min-h-screen relative">
      <CyberBackground />
      
      <AnimatePresence>
        {showWelcome && (
          <Welcome onStart={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>

      <main className="relative z-10 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-cyan text-transparent bg-clip-text">
              CyberMorph
            </h1>
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
          <ConversionQueue />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
