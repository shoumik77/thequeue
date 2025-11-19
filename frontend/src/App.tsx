import { Link } from 'react-router-dom'

export default function App() {
  return (
    <div style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui, Arial' }}>
      <h1>TheQueue</h1>
      <p>Phase 1 MVP</p>
      <ul>
        <li><Link to="/dj">DJ Dashboard</Link></li>
        <li>Audience links look like <code>/s/abcdef</code> once a session is created</li>
      </ul>
    </div>
  )
}
