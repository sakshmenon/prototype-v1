import { useAuth } from '../contexts/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentAcademicYearLabel, getCurrentAcademicYearSemesters, isSemesterPast } from '../lib/semesters'
import { fetchAuditSummary, type AuditSummary } from '../lib/audit'
import WelcomeBack from '../components/WelcomeBack'

const CREDITS_TARGET_PER_YEAR = 30

type CompletionRow = {
  semester_label: string | null
  classes: { credits: number } | null
}

type ScheduleRow = { semester_label: string }

function IconGraduationCap() {
  return (
    <svg className="home-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}
function IconTrendingUp() {
  return (
    <svg className="home-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}
function IconTarget() {
  return (
    <svg className="home-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
function IconAward() {
  return (
    <svg className="home-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      <path d="M8.523 12.89L7 22l5-3 5 3-1.523-9.11" />
    </svg>
  )
}

export default function Home() {
  const { user } = useAuth()
  const name = user?.user_metadata?.full_name ?? user?.email ?? 'there'
  const [completions, setCompletions] = useState<CompletionRow[]>([])
  const [schedule, setSchedule] = useState<ScheduleRow[]>([])
  const [audit, setAudit] = useState<AuditSummary | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)
  // Set to true to test the animation, false for production
  const FORCE_SHOW_WELCOME = false
  
  const [showWelcome, setShowWelcome] = useState(FORCE_SHOW_WELCOME)
  const [isReturningUser, setIsReturningUser] = useState(FORCE_SHOW_WELCOME)

  const yearLabel = getCurrentAcademicYearLabel()
  const yearSemesters = useMemo(() => getCurrentAcademicYearSemesters(), [])

  // Show welcome animation for returning users (once per session)
  useEffect(() => {
    if (!user?.id || FORCE_SHOW_WELCOME) return
    
    // Check if welcome was already shown this session
    const welcomeShownKey = `welcome_shown_${user.id}`
    const alreadyShown = sessionStorage.getItem(welcomeShownKey)
    
    console.log('[Welcome] Checking...', { alreadyShown, userId: user.id })
    
    if (alreadyShown) {
      console.log('[Welcome] Already shown this session, skipping')
      return
    }

    // Check if user has ANY data (profile, completions, or schedule) - indicates returning user
    Promise.all([
      supabase.from('profiles').select('freshman_semester, graduation_semester').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_class_completions').select('user_id').eq('user_id', user.id).limit(1),
      supabase.from('user_schedule').select('user_id').eq('user_id', user.id).limit(1)
    ]).then(([profileRes, completionsRes, scheduleRes]) => {
      const hasProfile = profileRes.data?.freshman_semester || profileRes.data?.graduation_semester
      const hasCompletions = (completionsRes.data?.length ?? 0) > 0
      const hasSchedule = (scheduleRes.data?.length ?? 0) > 0
      
      console.log('[Welcome] User data check:', { hasProfile, hasCompletions, hasSchedule })
      
      if (hasProfile || hasCompletions || hasSchedule) {
        console.log('[Welcome] Returning user detected! Showing animation')
        setIsReturningUser(true)
        setShowWelcome(true)
        sessionStorage.setItem(welcomeShownKey, 'true')
      } else {
        console.log('[Welcome] New user (no data), skipping animation')
      }
    })
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('user_class_completions')
      .select('semester_label, classes(credits)')
      .eq('user_id', user.id)
      .then(({ data }) => setCompletions((data ?? []) as CompletionRow[]))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('user_schedule')
      .select('semester_label')
      .eq('user_id', user.id)
      .then(({ data }) => setSchedule((data ?? []) as ScheduleRow[]))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    setAuditError(null)
    fetchAuditSummary(user.id, 'CS')
      .then(setAudit)
      .catch((e) => setAuditError(e?.message ?? String(e)))
  }, [user?.id])

  const yearCredits = useMemo(() => {
    const set = new Set(yearSemesters)
    return completions
      .filter((r) => r.semester_label && set.has(r.semester_label))
      .reduce((sum, r) => sum + (Number(r.classes?.credits) || 0), 0)
  }, [completions, yearSemesters])

  const yearPct = useMemo(() => {
    if (CREDITS_TARGET_PER_YEAR <= 0) return 0
    return Math.min(100, Math.round((yearCredits / CREDITS_TARGET_PER_YEAR) * 100))
  }, [yearCredits])

  const completionRate = useMemo(() => {
    if (!audit || audit.totalRequirements === 0) return 0
    return Math.round((audit.completedCount / audit.totalRequirements) * 100)
  }, [audit])

  const completedCredits = useMemo(() => {
    return completions.reduce((sum, r) => sum + (Number(r.classes?.credits) || 0), 0)
  }, [completions])

  const upcomingCourses = useMemo(() => {
    return schedule.filter((r) => r.semester_label && !isSemesterPast(r.semester_label)).length
  }, [schedule])

  // Show welcome animation for returning users
  if (showWelcome && isReturningUser) {
    console.log('[Welcome] Rendering WelcomeBack component', { showWelcome, isReturningUser })
    return <WelcomeBack onComplete={() => {
      console.log('[Welcome] Animation complete, showing home page')
      setShowWelcome(false)
      setIsReturningUser(false)
    }} />
  }

  return (
    <div className="home">
      <h1>Welcome, Saksh</h1>
      <p className="text-muted">Your academic planning hub.</p>

      <div className="home-stats-grid">
        <div className="home-stat-card">
          <div className="home-stat-icon-wrap home-stat-icon-blue">
            <IconGraduationCap />
          </div>
          <div className="home-stat-content">
            <p className="home-stat-value">{completionRate}%</p>
            <p className="home-stat-label text-muted">Degree Progress</p>
          </div>
        </div>
        <div className="home-stat-card">
          <div className="home-stat-icon-wrap home-stat-icon-green">
            <IconTrendingUp />
          </div>
          <div className="home-stat-content">
            <p className="home-stat-value">{completedCredits.toFixed(1)}</p>
            <p className="home-stat-label text-muted">Credits Earned</p>
          </div>
        </div>
        <div className="home-stat-card">
          <div className="home-stat-icon-wrap home-stat-icon-orange">
            <IconTarget />
          </div>
          <div className="home-stat-content">
            <p className="home-stat-value">{upcomingCourses}</p>
            <p className="home-stat-label text-muted">Upcoming Courses</p>
          </div>
        </div>
        <div className="home-stat-card">
          <div className="home-stat-icon-wrap home-stat-icon-purple">
            <IconAward />
          </div>
          <div className="home-stat-content">
            <p className="home-stat-value">{yearLabel || '—'}</p>
            <p className="home-stat-label text-muted">Current Year</p>
          </div>
        </div>
      </div>

      <div className="home-progress">
        <h2 className="home-progress-title">Academic progress</h2>
        {auditError && <div className="auth-error" role="alert">{auditError}</div>}

        <div className="home-progress-card">
          <div className="home-year-block">
            <div className="home-year-header">
              <h3 className="home-year-title">Current year</h3>
              <span className="home-year-label">{yearLabel || '—'}</span>
            </div>
            <div className="home-year-bar-wrap">
              <div
                className="home-year-bar-fill"
                style={{ width: `${yearPct}%` }}
                role="progressbar"
                aria-valuenow={yearCredits}
                aria-valuemin={0}
                aria-valuemax={CREDITS_TARGET_PER_YEAR}
                aria-label={`${yearCredits} of ${CREDITS_TARGET_PER_YEAR} credits`}
              />
            </div>
            <div className="home-year-credits">
              <span className="home-year-credits-value">{yearCredits.toFixed(1)}</span>
              <span className="text-muted"> / {CREDITS_TARGET_PER_YEAR} credits</span>
            </div>
          </div>

          {audit && (
            <div className="home-progress-stats">
              <div className="home-progress-stat">
                <div className="home-progress-stat-label">Requirements done</div>
                <div className="home-progress-stat-value">{audit.completedCount} / {audit.totalRequirements}</div>
              </div>
              <div className="home-progress-note text-muted">
                General Education slots counted as remaining until you add a Gen Ed tracker.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
