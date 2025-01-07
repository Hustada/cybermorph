'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function LoadingQueue() {
  return (
    <div className="w-full p-6 bg-cyber-charcoal/30 backdrop-blur-sm rounded-lg border border-cyber-cyan/20">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-cyber-cyan/10 rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-cyber-cyan/10 rounded w-3/4" />
              <div className="h-3 bg-cyber-cyan/10 rounded w-1/2" />
            </div>
            <div className="w-20 h-8 bg-cyber-cyan/10 rounded" />
          </motion.div>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <motion.div
          className="text-cyber-cyan/50 text-sm font-mono"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          LOADING CONVERSION QUEUE...
        </motion.div>
      </div>
    </div>
  )
}
