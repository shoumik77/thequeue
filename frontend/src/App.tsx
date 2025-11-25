import { Link } from 'react-router-dom'

export default function App() {
  return (
    <main className="relative min-h-screen">
      <header className="max-w-5xl mx-auto px-6 pt-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-white/10 border border-white/10" />
          <span className="text-lg font-semibold tracking-tight">TheQueue</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/dj" className="btn-ghost">DJ Dashboard</Link>
          <Link to="/admin" className="btn-ghost">Admin</Link>
          <a href="https://github.com/shoumik77/thequeue" target="_blank" rel="noreferrer" className="btn-ghost">GitHub</a>
        </nav>
      </header>

      <section className="max-w-5xl mx-auto px-6 mt-16 grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-5">
          <h1 className="heading">Crowd-powered DJ requests</h1>
          <p className="text-gray-300">Start a session, show the QR, and let the floor submit tracks. Manage requests live — accept, play, reorder — with a sleek DJ-first interface.</p>
          <div className="flex gap-3">
            <Link to="/dj" className="btn-primary">Start New Session</Link>
            <a href="#how" className="btn-ghost">How it works</a>
          </div>
        </div>
        <div className="panel">
          <div className="space-y-2">
            <div className="text-sm text-gray-300">What you get</div>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Shareable audience link & QR</li>
              <li>Now Playing & Next Up overview</li>
              <li>Live updates (no refresh)</li>
              <li>Queue controls & status updates</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="how" className="max-w-5xl mx-auto px-6 mt-16 grid gap-4 md:grid-cols-3">
        <div className="panel">
          <h3 className="font-semibold mb-2">1. Start</h3>
          <p className="text-sm text-gray-300">Create a session on the DJ Dashboard and display the QR.</p>
        </div>
        <div className="panel">
          <h3 className="font-semibold mb-2">2. Request</h3>
          <p className="text-sm text-gray-300">Guests submit song titles from their phones using your link.</p>
        </div>
        <div className="panel">
          <h3 className="font-semibold mb-2">3. Play</h3>
          <p className="text-sm text-gray-300">Accept, reorder, and mark tracks as playing or done in real time.</p>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-12 text-xs text-gray-400">
        Built for DJs • Inspired by Vercel aesthetics • Rekordbox-friendly vibes
      </footer>
    </main>
  )
}
