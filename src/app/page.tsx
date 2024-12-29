'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpTrayIcon, BeakerIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import { useQueue } from '@/context/QueueContext'
import ConversionQueue from '@/components/ConversionQueue'

const formatDescriptions = {
  webp: 'Next-gen format with superior compression and quality',
  png: 'Lossless compression with alpha channel support',
  jpg: 'Universal format with balanced compression',
}

export default function Home() {
  const [targetFormat, setTargetFormat] = useState('webp')
  const { addItems } = useQueue()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        addItems(acceptedFiles)
      }
    }
  })

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
                Upload multiple files for batch processing
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Format Selection */}
        <motion.div 
          className="bg-cyber-charcoal/50 backdrop-blur-sm rounded-lg p-8 border border-cyber-magenta/20"
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
                className="w-full bg-cyber-black border border-gray-600 rounded px-4 py-2 
                  focus:border-cyber-cyan focus:outline-none focus:shadow-neon-cyan"
              >
                {Object.entries(formatDescriptions).map(([format, desc]) => (
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
  )
}
