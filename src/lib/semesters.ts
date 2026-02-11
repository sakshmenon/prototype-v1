/**
 * Academic order: Fall, Spring, Summer per year. Fall 2024, Spring 2025, Summer 2025, Fall 2025, ...
 */
const TERM_ORDER = ['Fall', 'Spring', 'Summer'] as const

export function parseSemesterLabel(label: string): { term: string; year: number } | null {
  const parts = label.trim().split(/\s+/)
  if (parts.length < 2) return null
  const term = parts[0]
  const year = parseInt(parts[1], 10)
  if (!Number.isFinite(year)) return null
  return { term, year }
}

function termIndex(term: string): number {
  const i = TERM_ORDER.indexOf(term as (typeof TERM_ORDER)[number])
  return i >= 0 ? i : 0
}

/** Compare two semester labels (Fall 2024 < Spring 2025). */
export function compareSemesters(a: string, b: string): number {
  const sa = toState(a)
  const sb = toState(b)
  if (!sa || !sb) return 0
  // Compare by academic year first, then by term within that year
  if (sa.y !== sb.y) return sa.y - sb.y
  return sa.t - sb.t
}

/** Parsed label -> (y, t): Fall 2024 = (2024,0), Spring 2025 = (2024,1), Summer 2025 = (2024,2). */
function toState(label: string): { y: number; t: number } | null {
  const p = parseSemesterLabel(label)
  if (!p) return null
  if (p.term === 'Fall') return { y: p.year, t: 0 }
  if (p.term === 'Spring') return { y: p.year - 1, t: 1 }
  if (p.term === 'Summer') return { y: p.year - 1, t: 2 }
  return { y: p.year - 1, t: 1 }
}

function stateToLabel(y: number, t: number): string {
  if (t === 0) return `Fall ${y}`
  if (t === 1) return `Spring ${y + 1}`
  return `Summer ${y + 1}`
}

/**
 * Current semester based on today's date.
 * Sep–Dec → Fall, Jan–Apr → Spring, May–Aug → Summer (all current year).
 */
export function getCurrentSemester(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1–12
  if (month >= 9) return `Fall ${year}`
  if (month >= 5) return `Summer ${year}`
  return `Spring ${year}`
}

/**
 * Whether a semester is in the past (before current), current, or future.
 * Used to restrict planning to current/future only.
 */
export function isSemesterPast(semesterLabel: string): boolean {
  return compareSemesters(semesterLabel, getCurrentSemester()) < 0
}

export function isSemesterCurrentOrFuture(semesterLabel: string): boolean {
  return !isSemesterPast(semesterLabel)
}

export function getSemesterStatus(semesterLabel: string): 'past' | 'current' | 'future' {
  const current = getCurrentSemester()
  const cmp = compareSemesters(semesterLabel, current)
  if (cmp < 0) return 'past'
  if (cmp === 0) return 'current'
  return 'future'
}

/**
 * Semesters in the academic year that contains the current semester.
 * Fall 2025 → [Fall 2025, Spring 2026, Summer 2026]; Spring 2026 → same.
 */
export function getCurrentAcademicYearSemesters(): string[] {
  const current = getCurrentSemester()
  const p = parseSemesterLabel(current)
  if (!p) return [current]
  const { term, year } = p
  if (term === 'Fall') {
    return [`Fall ${year}`, `Spring ${year + 1}`, `Summer ${year + 1}`]
  }
  if (term === 'Spring' || term === 'Summer') {
    return [`Fall ${year - 1}`, `Spring ${year}`, `Summer ${year}`]
  }
  return [current]
}

/**
 * Label for the current academic year, e.g. "2025-26".
 */
export function getCurrentAcademicYearLabel(): string {
  const current = getCurrentSemester()
  const p = parseSemesterLabel(current)
  if (!p) return ''
  const { term, year } = p
  const startYear = term === 'Fall' ? year : year - 1
  const endYear = startYear + 1
  return `${startYear}-${String(endYear).slice(-2)}`
}

/**
 * Generate list of semester labels from start (inclusive) to end (inclusive).
 * Order: Fall 2024, Spring 2025, Summer 2025, Fall 2025, ...
 */
export function listSemestersBetween(freshmanLabel: string, graduationLabel: string): string[] {
  const startState = toState(freshmanLabel)
  const endState = toState(graduationLabel)
  if (!startState || !endState || compareSemesters(freshmanLabel, graduationLabel) > 0) return []

  const out: string[] = []
  let { y, t } = startState
  const maxSteps = 80

  for (let i = 0; i < maxSteps; i++) {
    if (y > endState.y || (y === endState.y && t > endState.t)) break
    out.push(stateToLabel(y, t))
    if (t < 2) t++
    else {
      t = 0
      y++
    }
  }
  return out
}
