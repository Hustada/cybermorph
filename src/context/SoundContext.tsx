'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'

interface SoundContextType {
  playIntroSequence: () => Promise<void>
  playProcessingSound: () => void
  stopProcessingSounds: () => void
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [sounds, setSounds] = useState<{ [key: string]: HTMLAudioElement }>({})
  const processingIntervalsRef = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    // Pre-load all sounds
    const soundFiles = {
      intro: '/sounds/synthintro4.wav',
      processing1: '/sounds/synth.wav',
      processing3: '/sounds/blipSelect.wav',
      processing4: '/sounds/blipSelect2.wav',
      processing5: '/sounds/blipSelect3.wav',
      processing6: '/sounds/click.wav',
      processing7: '/sounds/tone.wav',
    }

    const loadedSounds: { [key: string]: HTMLAudioElement } = {}
    
    Object.entries(soundFiles).forEach(([key, path]) => {
      const audio = new Audio(path)
      audio.preload = 'auto'
      // Set lower volume for processing sounds
      if (key.startsWith('processing')) {
        audio.volume = 0.4
      }
      loadedSounds[key] = audio
    })

    setSounds(loadedSounds)

    // Cleanup on unmount
    return () => {
      Object.values(loadedSounds).forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      stopProcessingSounds()
    }
  }, [])

  const playSound = async (soundKey: string, volume?: number) => {
    if (sounds[soundKey]) {
      const audio = sounds[soundKey]
      audio.currentTime = 0
      if (volume !== undefined) {
        audio.volume = volume
      }
      try {
        await audio.play()
      } catch (error) {
        console.error('Error playing sound:', error)
      }
    }
  }

  // Play intro sound
  const playIntroSequence = async () => {
    await playSound('intro', 0.7)
  }

  // Create a more intense processing sound experience
  const playProcessingSound = () => {
    const processingSounds = [
      'processing1', 'processing3', 
      'processing4', 'processing5', 'processing6', 'processing7'
    ]

    // Clear any existing intervals
    stopProcessingSounds()

    // Create multiple intervals with different timings for a more dynamic sound
    const intervals = [
      // Fast beeps
      setInterval(() => {
        const randomSound = processingSounds[Math.floor(Math.random() * 3)]
        playSound(randomSound, 0.3)
      }, 300),

      // Medium speed processing sounds
      setInterval(() => {
        const randomSound = processingSounds[Math.floor(Math.random() * processingSounds.length)]
        playSound(randomSound, 0.4)
      }, 600),

      // Occasional longer sounds
      setInterval(() => {
        const randomSound = processingSounds[3 + Math.floor(Math.random() * 3)]
        playSound(randomSound, 0.35)
      }, 900)
    ]

    processingIntervalsRef.current = intervals
  }

  const stopProcessingSounds = () => {
    processingIntervalsRef.current.forEach(interval => clearInterval(interval))
    processingIntervalsRef.current = []
  }

  return (
    <SoundContext.Provider 
      value={{
        playIntroSequence,
        playProcessingSound,
        stopProcessingSounds
      }}
    >
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const context = useContext(SoundContext)
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider')
  }
  return context
}
