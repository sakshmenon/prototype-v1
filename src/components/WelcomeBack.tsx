import { useEffect, useState } from 'react'

interface WelcomeBackProps {
  onComplete: () => void
}

export default function WelcomeBack({ onComplete }: WelcomeBackProps) {
  const [stage, setStage] = useState<'fadein' | 'visible' | 'fadeout'>('fadein')

  useEffect(() => {
    // Fade in for 800ms
    const fadeInTimer = setTimeout(() => {
      setStage('visible')
    }, 800)

    // Stay visible for 1200ms
    const visibleTimer = setTimeout(() => {
      setStage('fadeout')
    }, 2000)

    // Fade out for 800ms, then complete
    const fadeOutTimer = setTimeout(() => {
      onComplete()
    }, 2800)

    return () => {
      clearTimeout(fadeInTimer)
      clearTimeout(visibleTimer)
      clearTimeout(fadeOutTimer)
    }
  }, [onComplete])

  return (
    <div className={`welcome-back-overlay welcome-back-${stage}`}>
      <div className="welcome-back-content">
        <h1 className="welcome-back-title">welcome back</h1>
        <p className="welcome-back-signature">-Gradly</p>
      </div>
    </div>
  )
}
