'use client'

import { motion } from 'framer-motion'
import { useSound } from '@/context/SoundContext'

interface WelcomeProps {
  onStart: () => void
}

export default function Welcome({ onStart }: WelcomeProps) {
  const { playIntroSequence } = useSound()

  const handleStart = async () => {
    await playIntroSequence()
    onStart()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-cyber-black/90 backdrop-blur-md flex items-center justify-center z-50"
    >
      <div className="text-center space-y-8">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyber-cyan to-cyber-magenta text-transparent bg-clip-text"
        >
          CyberMorph
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-cyber-cyan/80"
        >
          Transform your images with cyberpunk style
        </motion.p>
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          className="px-8 py-3 rounded bg-gradient-to-r from-cyber-cyan to-cyber-magenta
            hover:shadow-neon-cyan transition-all text-lg font-semibold"
        >
          Enter CyberMorph
        </motion.button>
      </div>
    </motion.div>
  )
}
