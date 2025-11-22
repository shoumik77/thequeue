import { useEffect, useMemo, useState } from 'react'
import { api, updateRequestStatus, updateRequestPosition, wsUrlForSession } from '../api'
import type { SessionOut, RequestOut } from '../types'
import QRCode from 'qrcode.react'

export default function Dashboard() {
  const [name, setName] = useState('')
  const [session, setSession] = useState<SessionOut | null>(null)
  const [requests, setRequests] = useState<RequestOut[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'playing' | 'done' | 'rejected'>('all')
  const [wsConnected, setWsConnected] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [showQR, setShowQR] = useState(false)

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

  // auto-poll every 5s when a session is active
  useEffect(() => {
    if (!session || wsConnected) return
    const id = setInterval(() => {
      loadRequests()
    }, 5000)
    return () => clearInterval(id)
  }, [session?.id, wsConnected])

  // WebSocket connection per session
  useEffect(() => {
    if (!session) return
    const url = wsUrlForSession(session.id)
    const socket = new WebSocket(url)
    setWs(socket)
    socket.onopen = async () => {
      setWsConnected(true)
      // sync once on connect
      await loadRequests()
    }
    socket.onclose = () => setWsConnected(false)
    socket.onerror = () => setWsConnected(false)
    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg?.type === 'request:new' || msg?.type === 'request:update') {
          await loadRequests()
        }
      } catch (_) {
        // ignore parse errors
      }
    }
    // simple keepalive ping every 25s
    const pingId = setInterval(() => {
      try { socket.readyState === WebSocket.OPEN && socket.send('ping') } catch {}
    }, 25000)
    return () => {
      setWsConnected(false)
      try { socket.close() } catch {}
      setWs(null)
      clearInterval(pingId)
    }
  }, [session?.id])

  async function onSetStatus(id: number, status: RequestOut['status']) {
    if (status === 'done') {
      const ok = window.confirm('Mark this request as Done?')
      if (!ok) return
    }
    if (status === 'rejected') {
      const ok = window.confirm('Reject this request?')
      if (!ok) return
    }
    try {
      await updateRequestStatus(id, status)
      await loadRequests()
    } catch (e: any) {
      setError(e.message || 'Failed to update status')
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="heading">DJ Dashboard</h1>
        <span className={wsConnected ? 'badge-live' : 'badge-off'}>{wsConnected ? 'live' : 'offline'}</span>
      </div>
      {!session ? (
        <div className="mt-5 panel space-y-4 max-w-2xl">
          <label className="block text-sm font-medium">
            Session name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday Night – Club XYZ"
              className="mt-2 w-full rounded-md border border-white/10 bg-white/10 p-2 text-gray-100 placeholder:text-gray-400"
            />
          </label>
          <div className="flex items-center gap-2">
            <button onClick={createSession} disabled={!name || loading} className="btn-primary">
              {loading ? 'Creating…' : 'Start New Session'}
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="panel space-y-2">
            <div className="text-sm text-gray-300">
              <span className="font-semibold">Session:</span> {session.name} <span className="opacity-60">(id: {session.id})</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">Audience link:</span>
              <a className="text-blue-400 hover:underline" href={audienceUrl} target="_blank" rel="noreferrer">{audienceUrl}</a>
              <button onClick={() => navigator.clipboard.writeText(audienceUrl)} className="btn-ghost">Copy</button>
              <button onClick={() => setShowQR(true)} className="btn-ghost">Show QR</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadRequests} disabled={loading} className="btn-ghost">
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
          <div className="seg">
            {(['all','pending','accepted','playing','done','rejected'] as const).map((key) => (
              <button key={key} onClick={() => setStatusFilter(key)} className={statusFilter === key ? 'active' : ''}>
                {key}
              </button>
            ))}
          </div>
          {/* Now Playing & Next Up */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="panel">
              <h3 className="text-lg font-semibold mb-2">Now Playing</h3>
              {(() => {
                const np = requests.find(r => r.status === 'playing')
                return np ? (
                  <div>
                    <div className="font-medium">{np.song_title}{np.artist ? <span className="text-gray-500"> — {np.artist}</span> : ''}</div>
                    <div className="text-xs text-gray-500 mt-1">From: {np.guest_name || 'Anonymous'}</div>
                    {np.note && <div className="text-sm mt-1">Note: {np.note}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No song is currently playing.</div>
                )
              })()}
            </div>
            <div className="panel">
              <h3 className="text-lg font-semibold mb-2">Next Up</h3>
              {(() => {
                const list = requests.filter(r => r.status === 'accepted').slice(0, 3)
                if (list.length === 0) return <div className="text-sm text-gray-500">No upcoming songs.</div>
                return (
                  <ol className="list-decimal pl-5 space-y-2">
                    {list.map(r => (
                      <li key={r.id}>
                        <span className="font-medium">{r.song_title}</span>{r.artist ? <span className="text-gray-500"> — {r.artist}</span> : ''}
                        <span className="text-xs text-gray-500"> · From: {r.guest_name || 'Anonymous'}</span>
                      </li>
                    ))}
                  </ol>
                )
              })()}
            </div>
          </section>

          <h2 className="text-xl font-semibold pt-4">Requests</h2>
          <ul className="divide-y divide-white/10 glass">
            {(() => {
              const list = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter)
              if (list.length === 0) return <li className="p-4 text-sm text-gray-500">No requests yet.</li>
              return list.map((r) => (
              <li key={r.id} className="p-4">
                <div className="font-medium">
                  {r.song_title}{r.artist ? <span className="text-gray-500"> — {r.artist}</span> : ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  From: {r.guest_name || 'Anonymous'} · Status: {r.status} · Pos: {r.position}
                </div>
                {r.note && <div className="text-sm mt-1">Note: {r.note}</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      const newPos = Math.max(1, r.position - 1)
                      await updateRequestPosition(r.id, newPos)
                      await loadRequests()
                    }}
                    className="btn-ghost"
                  >
                    ↑ Up
                  </button>
                  <button
                    onClick={async () => {
                      const maxPos = requests.length
                      const newPos = Math.min(maxPos, r.position + 1)
                      await updateRequestPosition(r.id, newPos)
                      await loadRequests()
                    }}
                    className="btn-ghost"
                  >
                    ↓ Down
                  </button>
                  <button onClick={() => onSetStatus(r.id, 'accepted')} className="btn bg-amber-500/90 text-white hover:bg-amber-600">Accept</button>
                  <button onClick={() => onSetStatus(r.id, 'playing')} className="btn bg-green-600 text-white hover:bg-green-700">Playing</button>
                  <button onClick={() => onSetStatus(r.id, 'done')} className="btn bg-gray-700 text-white hover:bg-gray-800">Done</button>
                  <button onClick={() => onSetStatus(r.id, 'rejected')} className="btn bg-red-600 text-white hover:bg-red-700">Reject</button>
                </div>
              </li>
              ))
            })()}
          </ul>
          {showQR && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/60" onClick={() => setShowQR(false)}>
              <div className="panel" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-3">Audience QR</h3>
                <div className="flex items-center justify-center p-3 bg-white rounded-xl">
                  <QRCode value={audienceUrl} size={220} includeMargin={true} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button className="btn-primary" onClick={() => navigator.clipboard.writeText(audienceUrl)}>Copy Link</button>
                  <button className="btn-ghost" onClick={() => setShowQR(false)}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
