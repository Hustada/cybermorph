'use client'

import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, useMotionValue, animate } from 'framer-motion'

export default function CyberBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const { scrollY } = useScroll()

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 1000], [0, 150])
  const y2 = useTransform(scrollY, [0, 1000], [0, 250])
  const y3 = useTransform(scrollY, [0, 1000], [0, 350])

  // Mouse movement effects
  const springConfig = { damping: 20, stiffness: 150 }
  const moveX = useSpring(mouseX, springConfig)
  const moveY = useSpring(mouseY, springConfig)

  // Pulse animation value
  const pulse = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window
      const x = clientX / innerWidth
      const y = clientY / innerHeight
      mouseX.set(x - 0.5)
      mouseY.set(y - 0.5)
    }

    // Continuous pulse animation
    const pulseAnimation = animate(pulse, [0, 1], {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
      repeatType: "reverse"
    })

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      pulseAnimation.stop()
    }
  }, [mouseX, mouseY, pulse])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Radial Gradient Pulse */}
      <motion.div
        className="absolute inset-0 bg-radial-pulse"
        style={{
          scale: useTransform(pulse, [0, 1], [1, 1.1]),
          opacity: useTransform(pulse, [0, 0.5, 1], [0.3, 0.5, 0.3])
        }}
      />

      {/* Grid Layer */}
      <motion.div
        className="absolute inset-0"
        style={{ y: y1 }}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      </motion.div>

      {/* Circuit Lines with pulse */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: useTransform(moveX, [-0.5, 0.5], [-20, 20]),
          y: useTransform(moveY, [-0.5, 0.5], [-20, 20]),
          opacity: useTransform(pulse, [0, 0.5, 1], [0.05, 0.1, 0.05])
        }}
      >
        <div className="circuit-lines" />
      </motion.div>

      {/* Floating Particles */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: useTransform(moveX, [-0.5, 0.5], [-30, 30]),
          y: useTransform(moveY, [-0.5, 0.5], [-30, 30]),
          opacity: useTransform(pulse, [0, 0.5, 1], [0.1, 0.15, 0.1])
        }}
      >
        <div className="cyber-particles" />
      </motion.div>

      {/* Energy Field */}
      <motion.div 
        className="absolute inset-0 energy-field"
        style={{
          opacity: useTransform(pulse, [0, 0.5, 1], [0.1, 0.2, 0.1])
        }}
      />

      {/* Gradient Overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial"
        style={{
          opacity: useTransform(moveY, [-0.5, 0.5], [0.3, 0.7]),
          scale: useTransform(pulse, [0, 1], [1, 1.05])
        }}
      />

      {/* Scan Lines */}
      <div className="absolute inset-0 scanlines pointer-events-none" />

      {/* Vignette Effect */}
      <motion.div 
        className="absolute inset-0 vignette pointer-events-none"
        style={{
          opacity: useTransform(pulse, [0, 0.5, 1], [0.6, 0.7, 0.6])
        }}
      />
    </div>
  )
}
