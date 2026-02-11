import { supabase } from './supabase'

export type DegreeRequirement =
  | { requirement_type: 'course'; course_code: string; label: string }
  | { requirement_type: 'gen_ed'; course_code: null; label: string }
  | { requirement_type: string; course_code: string | null; label: string }

export type AuditSummary = {
  programCode: string
  totalRequirements: number
  completedCount: number
  remainingCount: number
  remainingCourses: string[]
  remainingGenEdSlots: number
}

function normalizeCourseCode(s: string): string {
  // 'CS 2011' -> 'CS2011', 'CS 2028C' -> 'CS2028C'
  return s.replace(/\s+/g, '').trim().toUpperCase()
}

export async function fetchAuditSummary(userId: string, programCode = 'CS'): Promise<AuditSummary> {
  const code = programCode?.trim() || 'CS'
  // 1) Load program: try by code first, then by name (e.g. "Computer Science" -> CS)
  let { data: program, error: programErr } = await supabase
    .from('degree_programs')
    .select('id, code')
    .eq('code', code)
    .maybeSingle()
  if (programErr) throw programErr
  if (!program) {
    const { data: byName } = await supabase
      .from('degree_programs')
      .select('id, code')
      .ilike('name', code)
      .limit(1)
      .maybeSingle()
    program = byName ?? null
  }
  if (!program) {
    return {
      programCode: code,
      totalRequirements: 0,
      completedCount: 0,
      remainingCount: 0,
      remainingCourses: [],
      remainingGenEdSlots: 0,
    }
  }

  const { data: reqs, error: reqErr } = await supabase
    .from('degree_requirements')
    .select('requirement_type, course_code, label, sequence')
    .eq('program_id', program.id)
    .order('sequence')
  if (reqErr) throw reqErr

  // 2) Load taken classes (join to classes to get course_id)
  const { data: taken, error: takenErr } = await supabase
    .from('user_class_completions')
    .select('course_code, classes(course_id)')
    .eq('user_id', userId)
  if (takenErr) throw takenErr

  const takenCodes = new Set(
    (taken ?? [])
      .map((r: any) => r?.classes?.course_id as string | undefined)
      .filter(Boolean)
      .map(normalizeCourseCode)
  )

  // 3) Compute remaining
  const remainingCourses: string[] = []
  let genEdSlots = 0
  let completed = 0

  for (const r of (reqs ?? []) as any[]) {
    if (r.requirement_type === 'gen_ed' || r.label === 'General Education') {
      genEdSlots += 1
      continue
    }
    const code = r.course_code ? normalizeCourseCode(r.course_code) : normalizeCourseCode(r.label)
    if (takenCodes.has(code)) completed += 1
    else remainingCourses.push(code)
  }

  const total = (reqs ?? []).length
  const remainingCount = remainingCourses.length + genEdSlots

  return {
    programCode: program.code,
    totalRequirements: total,
    completedCount: completed,
    remainingCount,
    remainingCourses,
    remainingGenEdSlots: genEdSlots,
  }
}

