'use client'

import React, { createContext, useContext, useCallback, useRef } from 'react'

interface SoundContextType {
  playIntroSequence: () => Promise<void>
  playProcessingSound: () => void
  stopProcessingSounds: () => void
  playDownloadSound: () => void
  playSubmitSound: () => void
  playSynthIntro4: () => Promise<void>
  playDropSound: () => void
}

const SoundContext = createContext<SoundContextType | null>(null)

export function useSound() {
  const context = useContext(SoundContext)
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider')
  }
  return context
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const audioCache = useRef<{ [key: string]: HTMLAudioElement }>({})
  const processingInterval = useRef<NodeJS.Timeout>()
  const synthIntro4Ref = useRef<HTMLAudioElement | null>(null)

  const playSound = useCallback(async (soundKey: string, volume: number = 1) => {
    if (!audioCache.current[soundKey]) {
      audioCache.current[soundKey] = new Audio(`/sounds/${soundKey}.wav`)
    }
    const audio = audioCache.current[soundKey]
    audio.volume = volume
    audio.currentTime = 0
    await audio.play()
  }, [])

  const playIntroSequence = useCallback(async () => {
    await playSound('cyberrobot', 0.5)
  }, [playSound])

  const playProcessingSound = useCallback(() => {
    let index = 0
    const sounds = ['tone', 'blipSelect', 'blipSelect2', 'blipSelect3']
    const playNext = () => {
      const volume = index === 0 ? 0.2 : 0.3
      playSound(sounds[index], volume)
      index = (index + 1) % sounds.length
    }

    playNext()
    processingInterval.current = setInterval(playNext, 400)
  }, [playSound])

  const stopProcessingSounds = useCallback(() => {
    if (processingInterval.current) {
      clearInterval(processingInterval.current)
    }
  }, [])

  const playDownloadSound = useCallback(() => {
    playSound('clickdownload', 0.4)
  }, [playSound])

  const playSubmitSound = useCallback(() => {
    playSound('synthintro4', 0.4)
  }, [playSound])

  const playDropSound = useCallback(() => {
    playSound('powerUp', 0.4)
  }, [playSound])

  const playSynthIntro4 = useCallback(async () => {
    if (!synthIntro4Ref.current) {
      synthIntro4Ref.current = new Audio('/sounds/synthintro4.wav')
    }
    try {
      await synthIntro4Ref.current.play()
    } catch (error) {
      console.error('Error playing synthIntro4:', error)
    }
  }, [])

  return (
    <SoundContext.Provider value={{
      playIntroSequence,
      playProcessingSound,
      stopProcessingSounds,
      playDownloadSound,
      playSubmitSound,
      playSynthIntro4,
      playDropSound
    }}>
      {children}
    </SoundContext.Provider>
  )
}
