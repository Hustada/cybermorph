'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface SecurityWarningProps {
  timeLeft: number
}

export default function SecurityWarning({ timeLeft }: SecurityWarningProps) {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-red-950 border border-red-500 p-6 rounded-lg shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-6">
          <svg 
            className="w-12 h-12 text-red-500 animate-pulse" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h2 className="text-2xl font-bold text-red-500">SECURITY ALERT</h2>
        </div>
        
        <div className="space-y-4 text-red-200">
          <p className="text-lg font-semibold">
            UNAUTHORIZED ACCESS ATTEMPT DETECTED
          </p>
          <p>
            This incident has been logged and reported to system administrators.
            Your IP address and device information have been recorded.
          </p>
          <p>
            Multiple failed access attempts may result in:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-2">
            <li>Temporary system lockout</li>
            <li>Account suspension</li>
            <li>Security audit investigation</li>
            <li>Network access restriction</li>
          </ul>
          <div className="mt-6 flex justify-between items-center text-sm opacity-75">
            <span>Reference ID: {Math.random().toString(36).substring(2, 15).toUpperCase()}</span>
            <span className="text-red-500 font-mono">System unlock in: {timeLeft}s</span>
          </div>

          <div className="mt-8 p-4 bg-black/30 rounded border border-red-500/30 text-red-300/70 text-sm italic">
            If you thought &ldquo;hacking mode&rdquo; was a real thing, we suggest taking a break and Googling &ldquo;basic security principles.&rdquo; Spoiler: You&apos;re not the main character. Idiot.
          </div>
        </div>

        <motion.div 
          className="mt-8 h-2 bg-red-950 rounded overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div 
            className="h-full bg-red-500"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: timeLeft, ease: "linear" }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
