'use client'

import { motion } from 'framer-motion'
import { CodeBracketIcon } from '@heroicons/react/24/outline'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full py-6 px-4 backdrop-blur-md border-t border-cyber-cyan/10 mt-20">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          className="flex flex-col md:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left side */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{currentYear}</span>
            <span className="text-cyber-cyan">CyberMorph</span>
            <span className="hidden md:inline">|</span>
            <span className="flex items-center gap-1">
              <span className="text-cyber-magenta">Forged by</span>
              <span className="text-cyber-cyan">The Victor Collective</span>
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 text-sm">
            <a 
              href="https://github.com/Hustada/cybermorph" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-400 hover:text-cyber-cyan transition-colors glow-hover px-3 py-1 rounded-full"
            >
              <CodeBracketIcon className="w-4 h-4" />
              <span>Source Protocol</span>
            </a>
          </div>
        </motion.div>

        {/* Decorative line */}
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-cyber-cyan/20 to-transparent" />
      </div>
    </footer>
  )
}
