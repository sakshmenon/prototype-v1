import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { listSemestersBetween, isSemesterPast, getSemesterStatus } from '../lib/semesters'
import { fetchAuditSummary, type AuditSummary } from '../lib/audit'

type ProfileSemesters = {
  freshman_semester: string | null
  graduation_semester: string | null
  major: string | null
}

const MIN_LEFT_PCT = 70
const MAX_LEFT_PCT = 98
const DEFAULT_LEFT_PCT = 90

type ClassRow = {
  course_id: string  // Primary identifier (e.g. CS1100)
  subject: string
  title: string
  credits: number
}

type ScheduleRow = {
  course_code: string  // References classes(course_id)
  semester_label: string
  title?: string
  credits?: number
}

type ScheduleResponseRow = {
  course_code: string
  semester_label: string
  classes: { course_id: string; title: string; credits: number } | { course_id: string; title: string; credits: number }[] | null
}

type CompletionRow = {
  course_code: string
  semester_label: string | null
  title?: string
  credits?: number
}

export default function Planning() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileSemesters | null>(null)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [schedule, setSchedule] = useState<ScheduleRow[]>([])
  const [classFilter, setClassFilter] = useState('')
  const [takenBySemester, setTakenBySemester] = useState<Record<string, CompletionRow[]>>({})
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const [addToSemesterClassId, setAddToSemesterClassId] = useState<string | null>(null)
  const [leftWidthPct, setLeftWidthPct] = useState(DEFAULT_LEFT_PCT)
  const [resizing, setResizing] = useState(false)
  const [audit, setAudit] = useState<AuditSummary | null>(null)

  const YEAR_LABELS = ['Freshman', 'Sophomore', 'Pre-junior', 'Junior', 'Senior'] as const
  const TERM_ORDER = ['Fall', 'Spring', 'Summer'] as const

  const semesters = profile?.freshman_semester && profile?.graduation_semester
    ? listSemestersBetween(profile.freshman_semester, profile.graduation_semester)
    : []

  /** Group semesters into year-in-school: each year has up to 3 semesters (Fall, Spring, Summer). */
  const semestersByYearInSchool = useMemo(() => {
    const out: { label: string; semesters: string[] }[] = []
    for (let i = 0; i < semesters.length; i += 3) {
      const chunk = semesters.slice(i, i + 3)
      const yearIndex = Math.floor(i / 3)
      const label = YEAR_LABELS[yearIndex] ?? `Year ${yearIndex + 1}`
      out.push({ label, semesters: chunk })
    }
    return out
  }, [semesters])

  const scheduleBySemester = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {}
    for (const row of schedule) {
      if (!map[row.semester_label]) map[row.semester_label] = []
      map[row.semester_label].push(row)
    }
    return map
  }, [schedule])

  const filteredClasses = useMemo(() => {
    const q = classFilter.trim().toLowerCase()
    if (!q) return classes
    return classes.filter(
      (c) =>
        c.course_id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.subject && c.subject.toLowerCase().includes(q))
    )
  }, [classes, classFilter])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('profiles')
      .select('freshman_semester, graduation_semester, major')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) return
        setProfile((data ?? { freshman_semester: null, graduation_semester: null, major: null }) as ProfileSemesters)
      })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('classes')
      .select('course_id, subject, title, credits')
      .order('course_id')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) return
        setClasses((data ?? []) as ClassRow[])
      })
    return () => { cancelled = true }
  }, [])

  const fetchSchedule = useCallback(() => {
    if (!user?.id) return
    supabase
      .from('user_schedule')
      .select('course_code, semester_label, classes(course_id, title, credits)')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) return
        const raw = (data ?? []) as unknown as ScheduleResponseRow[]
        const rows: ScheduleRow[] = raw.map((r) => ({
          // PostgREST may return a single object or an array depending on relationship inference
          // Normalize to the first object when an array is returned.
          course_code: r.course_code,
          semester_label: r.semester_label,
          title: (Array.isArray(r.classes) ? r.classes[0] : r.classes)?.title,
          credits: (Array.isArray(r.classes) ? r.classes[0] : r.classes)?.credits,
        }))
        setSchedule(rows)
      })
  }, [user?.id])

  const fetchTakenBySemester = useCallback(() => {
    if (!user?.id) return
    supabase
      .from('user_class_completions')
      .select('semester_label, course_code, classes(course_id, title, credits)')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) return
        const rows = (data ?? []) as any[]
        const map: Record<string, CompletionRow[]> = {}
        for (const r of rows) {
          const sem = (r.semester_label as string | null) ?? 'Unknown'
          const entry: CompletionRow = {
            course_code: r.course_code,
            semester_label: r.semester_label,
            title: r.classes?.title,
            credits: r.classes?.credits,
          }
          if (!map[sem]) map[sem] = []
          map[sem].push(entry)
        }
        setTakenBySemester(map)
      })
  }, [user?.id])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  useEffect(() => {
    fetchTakenBySemester()
  }, [fetchTakenBySemester])

  useEffect(() => {
    if (!user?.id) return
    const programCode = profile?.major?.trim() || 'CS'
    fetchAuditSummary(user.id, programCode)
      .then(setAudit)
      .catch(() => setAudit(null))
  }, [user?.id, profile?.major])

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const pct = (e.clientX / window.innerWidth) * 100
      setLeftWidthPct(Math.min(MAX_LEFT_PCT, Math.max(MIN_LEFT_PCT, pct)))
    }
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  async function addClassToSemester(courseCode: string, semesterLabel: string) {
    if (!user?.id) return
    const isPast = isSemesterPast(semesterLabel)
    if (isPast) {
      await supabase
        .from('user_class_completions')
        .upsert(
          { user_id: user.id, course_code: courseCode, semester_label: semesterLabel },
          { onConflict: 'user_id,course_code' }
        )
      fetchTakenBySemester()
    } else {
      await supabase
        .from('user_schedule')
        .upsert(
          { user_id: user.id, course_code: courseCode, semester_label: semesterLabel },
          { onConflict: 'user_id,course_code' }
        )
      fetchSchedule()
    }
    setAddToSemesterClassId(null)
  }

  async function removeFromSchedule(courseCode: string) {
    if (!user?.id) return
    await supabase
      .from('user_schedule')
      .delete()
      .eq('user_id', user.id)
      .eq('course_code', courseCode)
    fetchSchedule()
  }

  if (loading) {
    return <div className="planning-loading">Loading plan…</div>
  }

  const needsSetup = !profile?.freshman_semester || !profile?.graduation_semester

  return (
    <div className="planning-page planning-page-split">
      {needsSetup ? (
        <div className="planning-setup">
          <p>Set your <strong>freshman semester</strong> and <strong>planned graduation semester</strong> in your profile to see your semester plan.</p>
          <Link to="/profile" className="btn btn-primary">Go to Profile</Link>
        </div>
      ) : (
        <div className="planning-split-layout">
          <div className="planning-left" style={{ width: `${leftWidthPct}%` }}>
            <button
              type="button"
              className="planning-search-trigger"
              onClick={() => setSearchOverlayOpen(true)}
            >
              <span className="planning-search-trigger-placeholder">Search classes…</span>
            </button>
            <div className="planning-cards">
          {semestersByYearInSchool.map(({ label: yearLabel, semesters: yearSemesters }) => (
            <div key={yearLabel} className="planning-year-card">
              <div className="planning-year-header">
                <h3 className="planning-year-title">{yearLabel}</h3>
              </div>
              <div className="planning-year-grid planning-year-grid-three">
                {TERM_ORDER.map((termName, idx) => {
                  const sem = yearSemesters[idx]
                  if (!sem) return <div key={termName} className="planning-semester-card planning-semester-card-empty" aria-hidden />
                  const isPast = isSemesterPast(sem)
                  const status = getSemesterStatus(sem)
                  const statusLabel = status === 'past' ? 'Done' : status === 'current' ? 'Active' : 'Plan'
                  return (
                    <div
                      key={sem}
                      className={`planning-card planning-semester-card ${isPast ? 'planning-card-past' : ''}`}
                    >
                      <div className="planning-semester-header">
                        <h4 className="planning-semester-title">{termName}</h4>
                        <span className="planning-semester-label">{sem}</span>
                        <span className={`planning-card-badge planning-card-badge-${status}`}>{statusLabel}</span>
                      </div>
                      <div className="planning-semester-body">
                        {(takenBySemester[sem] ?? []).length > 0 && (
                          <>
                            <div className="planning-taken-title">Taken</div>
                            <ul className="planning-schedule-list">
                              {(takenBySemester[sem] ?? []).map((row) => (
                                <li key={row.course_code} className="planning-schedule-item planning-schedule-item-taken">
                                  <span className="planning-schedule-item-title">
                                    {row.course_code} – {row.title ?? 'Class'}
                                  </span>
                                  {row.credits != null && (
                                    <span className="planning-schedule-item-credits">{row.credits} cr</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {!isPast && (
                          <ul className="planning-schedule-list">
                            {(scheduleBySemester[sem] ?? []).map((row) => (
                              <li key={row.course_code} className="planning-schedule-item">
                                <span className="planning-schedule-item-title">{row.course_code} – {row.title ?? 'Class'}</span>
                                {row.credits != null && <span className="planning-schedule-item-credits">{row.credits} cr</span>}
                                <button
                                  type="button"
                                  className="planning-schedule-remove btn btn-ghost"
                                  onClick={() => removeFromSchedule(row.course_code)}
                                  aria-label="Remove from schedule"
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {isPast && (takenBySemester[sem] ?? []).length === 0 && (
                          <p className="planning-card-past-hint text-muted">No classes recorded for this semester.</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
            </div>
          </div>
          <div
            className="planning-resizer"
            onMouseDown={() => setResizing(true)}
            role="separator"
            aria-valuenow={leftWidthPct}
            aria-valuemin={MIN_LEFT_PCT}
            aria-valuemax={MAX_LEFT_PCT}
            aria-label="Resize panels"
          />
          <div className="planning-right planning-right-requirements">
            <h2 className="planning-requirements-title">Requirements</h2>
            {!audit ? (
              <p className="planning-requirements-muted text-muted">Loading requirements…</p>
            ) : audit.totalRequirements === 0 ? (
              <p className="planning-requirements-muted text-muted">No requirements for {profile?.major || 'CS'}.</p>
            ) : (
              <>
                <div className="planning-requirements-summary">
                  <span className="planning-requirements-count">{audit.remainingCount}</span>
                  <span className="text-muted"> / {audit.totalRequirements} remaining</span>
                </div>
                {audit.remainingCourses.length > 0 && (
                  <ul className="planning-requirements-list">
                    {audit.remainingCourses.map((c) => (
                      <li key={c} className="planning-requirements-item">{c}</li>
                    ))}
                  </ul>
                )}
                {audit.remainingGenEdSlots > 0 && (
                  <p className="planning-requirements-gened text-muted">Gen Ed: {audit.remainingGenEdSlots} slot(s)</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {searchOverlayOpen && (
        <div
          className="planning-search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Search classes"
        >
          <div className="planning-search-overlay-backdrop" onClick={() => setSearchOverlayOpen(false)} />
          <div className="planning-search-overlay-center">
            <div className="planning-search-overlay-card">
              <div className="planning-search-overlay-header">
                <input
                  type="text"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  placeholder="Search by course, title, or subject…"
                  className="auth-input planning-search-overlay-input"
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-ghost planning-search-overlay-close"
                  onClick={() => setSearchOverlayOpen(false)}
                  aria-label="Close search"
                >
                  Close
                </button>
              </div>
              <div className="planning-search-overlay-results">
                {classFilter.trim() ? (
                  filteredClasses.length === 0 ? (
                    <p className="planning-browser-empty text-muted">No classes match your search.</p>
                  ) : (
                    <ul className="planning-class-list">
                      {filteredClasses.map((c) => (
                        <li key={c.course_id} className="planning-class-item planning-class-item-selectable">
                          <div className="planning-class-item-head">
                            <span className="planning-class-item-course">{c.course_id}</span>
                            <span className="planning-class-item-credits">{c.credits} cr</span>
                          </div>
                          <div className="planning-class-item-title">{c.title}</div>
                          <div className="planning-class-item-actions">
                            {addToSemesterClassId === c.course_id ? (
                              <select
                                className="auth-input planning-semester-select"
                                value=""
                                onChange={(e) => {
                                  const sem = e.target.value
                                  if (sem) addClassToSemester(c.course_id, sem)
                                }}
                                onBlur={() => setAddToSemesterClassId(null)}
                                autoFocus
                              >
                                <option value="">Choose semester…</option>
                                {semesters.map((sem) => (
                                  <option key={sem} value={sem}>{sem}</option>
                                ))}
                              </select>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setAddToSemesterClassId(c.course_id)}
                              >
                                Add to semester
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="planning-browser-empty text-muted">Type to search for classes.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
