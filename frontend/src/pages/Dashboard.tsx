import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { SessionOut, RequestOut } from '../types'

export default function Dashboard() {
  const [name, setName] = useState('')
  const [session, setSession] = useState<SessionOut | null>(null)
  const [requests, setRequests] = useState<RequestOut[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audienceUrl = useMemo(() => {
    if (!session) return ''
    const origin = window.location.origin
    return `${origin}/s/${session.slug}`
  }, [session])

  async function createSession() {
    setLoading(true)
    setError(null)
    try {
      const data = await api<SessionOut>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ name })
      })
      setSession(data)
      setRequests([])
    } catch (e: any) {
      setError(e.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  async function loadRequests() {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const data = await api<RequestOut[]>(`/sessions/${session.id}/requests`)
      setRequests(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) loadRequests()
  }, [session?.id])

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'system-ui, Arial' }}>
      <h1>DJ Dashboard</h1>
      {!session ? (
        <div style={{ marginTop: '1rem' }}>
          <label>
            Session name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday Night – Club XYZ"
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 8 }}
            />
          </label>
          <button onClick={createSession} disabled={!name || loading} style={{ marginTop: 12 }}>
            {loading ? 'Creating…' : 'Start New Session'}
          </button>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Session:</strong> {session.name} (id: {session.id})</p>
          <p>
            <strong>Audience link:</strong>
            <a href={audienceUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>{audienceUrl}</a>
          </p>
          <div style={{ marginTop: 12 }}>
            <button onClick={loadRequests} disabled={loading}>Refresh Requests</button>
          </div>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <h2 style={{ marginTop: 24 }}>Requests</h2>
          <ul>
            {requests.length === 0 && <li>No requests yet.</li>}
            {requests.map((r) => (
              <li key={r.id} style={{ padding: 8, borderBottom: '1px solid #ddd' }}>
                <div>
                  <strong>{r.song_title}</strong>{r.artist ? ` – ${r.artist}` : ''}
                </div>
                <div style={{ fontSize: 12, color: '#555' }}>
                  From: {r.guest_name || 'Anonymous'} | Status: {r.status} | Pos: {r.position}
                </div>
                {r.note && <div style={{ fontSize: 12 }}>Note: {r.note}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
