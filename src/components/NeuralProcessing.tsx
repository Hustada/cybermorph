'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProcessStep {
  id: number
  text: string
  duration: number
}

const processSteps: ProcessStep[] = [
  { id: 1, text: "Initializing Quantum Neural Matrix", duration: 1000 },
  { id: 2, text: "Calibrating Synaptic Resonance", duration: 800 },
  { id: 3, text: "Engaging Photonic Data Streams", duration: 600 },
  { id: 4, text: "Stabilizing Quantum Coherence", duration: 700 },
  { id: 5, text: "Optimizing Neural Pathways", duration: 500 },
  { id: 6, text: "Synchronizing Transform Protocols", duration: 900 }
]

interface Props {
  isProcessing: boolean
  onComplete: () => void
}

export default function NeuralProcessing({ isProcessing, onComplete }: Props) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [showComponent, setShowComponent] = React.useState(false)

  React.useEffect(() => {
    const timeouts: readonly NodeJS.Timeout[] = []

    if (isProcessing) {
      setShowComponent(true)
      setCurrentStep(0)

      let totalDelay = 0
      processSteps.forEach((_, index) => {
        const timeout = setTimeout(() => {
          setCurrentStep(index + 1)
        }, totalDelay)
        timeouts.push(timeout)
        totalDelay += processSteps[index].duration
      })

      // Final timeout to complete the process
      const finalTimeout = setTimeout(() => {
        setShowComponent(false)
        onComplete()
      }, totalDelay + 800) // Add a small delay after the last step
      timeouts.push(finalTimeout)
    }

    // Cleanup function
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [isProcessing, onComplete])

  return (
    <AnimatePresence>
      {showComponent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-20"
        >
          <div className="max-w-md w-full mx-auto">
            <div className="relative">
              {/* Neural Network Background Animation */}
              <div className="absolute inset-0 neural-grid opacity-20" />
              
              <div className="bg-cyber-black/90 border border-cyber-cyan/30 rounded-lg p-6 shadow-neon-cyan">
                <div className="mb-4">
                  <h3 className="text-cyber-cyan text-center font-mono text-lg mb-2">
                    Neural Image Transformation Protocol
                  </h3>
                  <div className="h-1 w-full bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-cyan" />
                </div>

                <div className="space-y-3">
                  {processSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 transition-all duration-300 ${
                        index < currentStep ? 'text-cyber-cyan' : 'text-gray-500 opacity-30'
                      }`}
                    >
                      <div className="w-5 h-5 relative">
                        {index === currentStep - 1 ? (
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [1, 0.5, 1]
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="absolute inset-0 bg-cyber-cyan rounded-full"
                          />
                        ) : (
                          <div
                            className={`w-full h-full rounded-full border-2 transition-colors duration-300 ${
                              index < currentStep
                                ? 'bg-cyber-cyan border-cyber-cyan'
                                : 'border-gray-500'
                            }`}
                          />
                        )}
                      </div>
                      <span className="font-mono text-sm">{step.text}</span>
                      {index === currentStep - 1 && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1] }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                          className="ml-auto font-mono text-xs"
                        >
                          Processing...
                        </motion.span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-magenta"
                      initial={{ width: "0%" }}
                      animate={{
                        width: `${(currentStep / processSteps.length) * 100}%`
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
