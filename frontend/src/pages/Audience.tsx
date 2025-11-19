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

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-500">{error}</div>
  if (!session) return <div className="p-6">Session not found</div>

  const nowPlaying = requests.find(r => r.status === 'playing') || null
  const nextUp = requests.filter(r => r.status === 'accepted').slice(0, 3)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{session.name}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Submit a song request</p>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40">
        <label className="text-sm">
          Song title (required)
          <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} required className="mt-1 w-full rounded-md border border-gray-300 bg-white/80 p-2 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
        </label>
        <label className="text-sm">
          Artist (optional)
          <input value={artist} onChange={(e) => setArtist(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white/80 p-2 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
        </label>
        <label className="text-sm">
          Your name (optional)
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white/80 p-2 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
        </label>
        <label className="text-sm">
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white/80 p-2 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
        </label>
        <button type="submit" disabled={submitting || !songTitle} className="mt-1 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
      {success && <p className="text-green-600 mt-2 text-sm">{success}</p>}
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 mt-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40">
          <h3 className="text-lg font-semibold mb-2">Now Playing</h3>
          {nowPlaying ? (
            <div>
              <div className="font-medium">{nowPlaying.song_title}{nowPlaying.artist ? <span className="text-gray-500"> — {nowPlaying.artist}</span> : ''}</div>
              <div className="text-xs text-gray-500 mt-1">Requested by: {nowPlaying.guest_name || 'Anonymous'}</div>
              {nowPlaying.note && <div className="text-sm mt-1">Note: {nowPlaying.note}</div>}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No song is currently playing.</div>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40">
          <h3 className="text-lg font-semibold mb-2">Next Up</h3>
          {nextUp.length === 0 ? (
            <div className="text-sm text-gray-500">No upcoming songs.</div>
          ) : (
            <ol className="list-decimal pl-5 space-y-2">
              {nextUp.map(r => (
                <li key={r.id}>
                  <span className="font-medium">{r.song_title}</span>{r.artist ? <span className="text-gray-500"> — {r.artist}</span> : ''}
                  <span className="text-xs text-gray-500"> · By: {r.guest_name || 'Anonymous'}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <h2 className="text-xl font-semibold mt-6">Queue</h2>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-md bg-white/60 dark:bg-gray-900/40">
        {requests.length === 0 && <li className="p-4 text-sm text-gray-500">No requests yet.</li>}
        {requests.slice(0, 10).map((r) => (
          <li key={r.id} className="p-4">
            <div className="font-medium">
              {r.song_title}{r.artist ? <span className="text-gray-500"> — {r.artist}</span> : ''}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Status: {r.status} · Pos: {r.position}
            </div>
            {r.note && <div className="text-sm mt-1">Note: {r.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
