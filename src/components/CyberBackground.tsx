'use client'

import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window
      const x = clientX / innerWidth
      const y = clientY / innerHeight
      mouseX.set(x - 0.5)
      mouseY.set(y - 0.5)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Grid Layer */}
      <motion.div
        className="absolute inset-0"
        style={{ y: y1 }}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      </motion.div>

      {/* Circuit Lines */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: useTransform(moveX, [-0.5, 0.5], [-20, 20]),
          y: useTransform(moveY, [-0.5, 0.5], [-20, 20]),
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
        }}
      >
        <div className="cyber-particles" />
      </motion.div>

      {/* Gradient Overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial"
        style={{
          opacity: useTransform(moveY, [-0.5, 0.5], [0.3, 0.7]),
        }}
      />

      {/* Scan Lines */}
      <div className="absolute inset-0 scanlines pointer-events-none" />

      {/* Vignette Effect */}
      <div className="absolute inset-0 vignette pointer-events-none" />
    </div>
  )
}
