'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useSound } from '@/context/SoundContext'

interface PasswordDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
}

export default function PasswordDialog({ open, onClose, onSubmit }: PasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { playSynthIntro4 } = useSound()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      await onSubmit(password)
      setPassword('')
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid password')
      await playSynthIntro4()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-cyber-black border border-cyber-cyan/30 p-6 rounded-lg shadow-xl 
              shadow-cyber-cyan/20 max-w-md w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-cyber-cyan">Enter Hacking Mode</h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-cyber-magenta transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 rounded bg-cyber-black/50 border border-cyber-cyan/30
                    focus:border-cyber-magenta focus:outline-none text-cyber-cyan placeholder-gray-500"
                  disabled={isSubmitting}
                  autoFocus
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-cyber-magenta mt-2"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-cyber-magenta transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyber-cyan/20 text-cyber-cyan rounded 
                    hover:bg-cyber-magenta/20 hover:text-cyber-magenta transition-all duration-300
                    border border-cyber-cyan/30 hover:border-cyber-magenta/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying...' : 'Enable Hacking Mode'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
