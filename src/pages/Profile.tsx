import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const TERMS = ['Fall', 'Spring', 'Summer'] as const
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR - 4 + i) // e.g. 2021–2036

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  age: number | null
  phone: string | null
  major: string | null
  minor: string | null
  gpa: number | null
  freshman_semester: string | null
  graduation_semester: string | null
  created_at?: string
  updated_at?: string
}

function parseSemester(s: string | null): { term: string; year: number } | null {
  if (!s?.trim()) return null
  const parts = s.trim().split(/\s+/)
  if (parts.length < 2) return null
  const term = parts[0]
  const year = parseInt(parts[1], 10)
  if (!TERMS.includes(term as (typeof TERMS)[number]) || !Number.isFinite(year)) return null
  return { term, year }
}

function formatSemester(term: string, year: number): string {
  return `${term} ${year}`
}

const emptyProfile: ProfileRow = {
  id: '',
  full_name: null,
  email: null,
  avatar_url: null,
  age: null,
  phone: null,
  major: null,
  minor: null,
  gpa: null,
  freshman_semester: null,
  graduation_semester: null,
}

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<ProfileRow>(emptyProfile)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, age, phone, major, minor, gpa, freshman_semester, graduation_semester')
      .eq('id', user.id)
      .single()
      .then(({ data, error: e }) => {
        if (cancelled) return
        setLoading(false)
        if (e) {
          setError(e.message)
          return
        }
        const row = (data ?? emptyProfile) as ProfileRow
        setProfile(row)
        setForm({
          ...emptyProfile,
          ...row,
        })
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    if (name === 'age') {
      const n = value === '' ? null : Number(value)
      setForm((prev) => ({ ...prev, [name]: n }))
    } else if (name === 'gpa') {
      const n = value === '' ? null : Number(value)
      setForm((prev) => ({ ...prev, gpa: n }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value || null }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setError(null)
    setSuccess(false)
    setSaving(true)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name || null,
        age: form.age ?? null,
        phone: form.phone || null,
        major: form.major || null,
        minor: form.minor || null,
        gpa: form.gpa ?? null,
        freshman_semester: form.freshman_semester || null,
        graduation_semester: form.graduation_semester || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setProfile({ ...profile!, ...form })
    setSuccess(true)
  }

  if (loading) {
    return <div className="profile-loading">Loading profile…</div>
  }

  return (
    <div className="profile-page">
      <h1 className="profile-title">Profile</h1>
      <p className="profile-subtitle">Update your information.</p>

      <form onSubmit={handleSubmit} className="profile-form">
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="profile-success" role="status">
            Profile saved.
          </div>
        )}

        <label className="auth-label">
          Name
          <input
            type="text"
            name="full_name"
            value={form.full_name ?? ''}
            onChange={handleChange}
            placeholder="Your name"
            className="auth-input"
            autoComplete="name"
          />
        </label>
        <label className="auth-label">
          Email
          <input
            type="email"
            name="email"
            value={form.email ?? ''}
            readOnly
            className="auth-input auth-input-readonly"
            aria-readonly
          />
          <span className="profile-hint">Email is managed by your account.</span>
        </label>
        <label className="auth-label">
          Age
          <input
            type="number"
            name="age"
            min={1}
            max={120}
            value={form.age ?? ''}
            onChange={handleChange}
            placeholder="e.g. 20"
            className="auth-input"
          />
        </label>
        <label className="auth-label">
          Phone
          <input
            type="tel"
            name="phone"
            value={form.phone ?? ''}
            onChange={handleChange}
            placeholder="e.g. (555) 123-4567"
            className="auth-input"
            autoComplete="tel"
          />
        </label>
        <label className="auth-label">
          Major
          <input
            type="text"
            name="major"
            value={form.major ?? ''}
            onChange={handleChange}
            placeholder="e.g. Computer Science"
            className="auth-input"
          />
        </label>
        <label className="auth-label">
          Minor
          <input
            type="text"
            name="minor"
            value={form.minor ?? ''}
            onChange={handleChange}
            placeholder="e.g. Mathematics"
            className="auth-input"
          />
        </label>
        <label className="auth-label">
          GPA
          <input
            type="number"
            name="gpa"
            min={0}
            max={4}
            step={0.01}
            value={form.gpa ?? ''}
            onChange={handleChange}
            placeholder="e.g. 3.75"
            className="auth-input"
          />
        </label>
        <div className="profile-semester-row">
          <label className="auth-label">
            Freshman semester
            <div className="profile-semester-inputs">
              <select
                name="freshman_term"
                value={parseSemester(form.freshman_semester)?.term ?? ''}
                onChange={(e) => {
                  const parsed = parseSemester(form.freshman_semester)
                  const year = parsed?.year ?? CURRENT_YEAR
                  setForm((prev) => ({ ...prev, freshman_semester: formatSemester(e.target.value, year) }))
                }}
                className="auth-input"
              >
                <option value="">Select term</option>
                {TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                name="freshman_year"
                value={parseSemester(form.freshman_semester)?.year ?? ''}
                onChange={(e) => {
                  const parsed = parseSemester(form.freshman_semester)
                  const term = parsed?.term || 'Fall'
                  setForm((prev) => ({ ...prev, freshman_semester: formatSemester(term, Number(e.target.value)) }))
                }}
                className="auth-input"
              >
                <option value="">Year</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="auth-label">
            Planned graduation semester
            <div className="profile-semester-inputs">
              <select
                name="graduation_term"
                value={parseSemester(form.graduation_semester)?.term ?? ''}
                onChange={(e) => {
                  const parsed = parseSemester(form.graduation_semester)
                  const year = parsed?.year ?? CURRENT_YEAR + 4
                  setForm((prev) => ({ ...prev, graduation_semester: formatSemester(e.target.value, year) }))
                }}
                className="auth-input"
              >
                <option value="">Select term</option>
                {TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                name="graduation_year"
                value={parseSemester(form.graduation_semester)?.year ?? ''}
                onChange={(e) => {
                  const parsed = parseSemester(form.graduation_semester)
                  const term = parsed?.term || 'Spring'
                  setForm((prev) => ({ ...prev, graduation_semester: formatSemester(term, Number(e.target.value)) }))
                }}
                className="auth-input"
              >
                <option value="">Year</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </label>
        </div>
        <button type="submit" className="btn btn-primary profile-submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
