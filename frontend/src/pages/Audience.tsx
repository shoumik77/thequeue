import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import type { SessionOut, RequestOut } from '../types'

export default function Audience() {
  const { slug } = useParams()
  const [session, setSession] = useState<SessionOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [songTitle, setSongTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [guestName, setGuestName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [requests, setRequests] = useState<RequestOut[]>([])

  useEffect(() => {
    async function run() {
      if (!slug) return
      setLoading(true)
      setError(null)
      try {
        const s = await api<SessionOut>(`/sessions/${slug}`)
        setSession(s)
        const r = await api<RequestOut[]>(`/sessions/${s.id}/requests`)
        setRequests(r)
      } catch (e: any) {
        setError(e.message || 'Failed to load session')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [slug])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await api<RequestOut>(`/sessions/${session.id}/requests`, {
        method: 'POST',
        body: JSON.stringify({
          song_title: songTitle,
          artist: artist || undefined,
          guest_name: guestName || undefined,
          note: note || undefined,
        })
      })
      setSuccess('Request submitted!')
      setSongTitle('')
      setArtist('')
      setGuestName('')
      setNote('')
      const r = await api<RequestOut[]>(`/sessions/${session.id}/requests`)
      setRequests(r)
    } catch (e: any) {
      setError(e.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ padding: 24, fontFamily: 'system-ui, Arial' }}>Loading…</div>
  if (error) return <div style={{ padding: 24, fontFamily: 'system-ui, Arial', color: 'crimson' }}>{error}</div>
  if (!session) return <div style={{ padding: 24, fontFamily: 'system-ui, Arial' }}>Session not found</div>

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui, Arial' }}>
      <h1>{session.name}</h1>
      <p>Submit a song request</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
        <label>
          Song title (required)
          <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </label>
        <label>
          Artist (optional)
          <input value={artist} onChange={(e) => setArtist(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <label>
          Your name (optional)
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <label>
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <button type="submit" disabled={submitting || !songTitle}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
      {success && <p style={{ color: 'green' }}>{success}</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <h2 style={{ marginTop: 24 }}>Queue</h2>
      <ul>
        {requests.length === 0 && <li>No requests yet.</li>}
        {requests.slice(0, 10).map((r) => (
          <li key={r.id} style={{ padding: 8, borderBottom: '1px solid #ddd' }}>
            <div>
              <strong>{r.song_title}</strong>{r.artist ? ` – ${r.artist}` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#555' }}>
              Status: {r.status} | Pos: {r.position}
            </div>
            {r.note && <div style={{ fontSize: 12 }}>Note: {r.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
