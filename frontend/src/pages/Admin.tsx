import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { fetchSessions, endSession, getSessionUrl, setAuthToken, AdminSession } from '../api';

export default function Admin() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const navigate = useNavigate();

  // Load sessions when token changes
  useEffect(() => {
    if (!token) return;
    
    const loadSessions = async () => {
      try {
        setLoading(true);
        const data = await fetchSessions();
        setSessions(data.sessions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
        // Clear token on auth failure
        if (err instanceof Error && err.message.includes('401')) {
          handleSignOut();
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadSessions();
  }, [token]);

  const handleSignIn = (token: string) => {
    setToken(token);
    setAuthToken(token);
    localStorage.setItem('adminToken', token);
  };

  const handleSignOut = () => {
    setToken('');
    setAuthToken(null);
    localStorage.removeItem('adminToken');
  };

  const handleEndSession = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to end this session? This cannot be undone.')) {
      return;
    }
    
    try {
      await endSession(sessionId);
      // Update local state to reflect the change
      setSessions(sessions.map(session => 
        session.id === sessionId ? { ...session, is_active: false } : session
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
    // For now, we'll just log to console
    console.log('Copied to clipboard:', text);
  };

  // If no token is set, show login form
  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 glass">
        <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Admin Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn(token)}
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Enter admin token"
              autoFocus
            />
          </div>
          <button
            onClick={() => handleSignIn(token)}
            className="w-full btn-primary flex items-center justify-center gap-2"
            disabled={!token.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <header className="flex justify-between items-center mb-8">
        <h1 className="heading">Admin Panel</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setToken('')}
            className="btn-ghost text-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="glass p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Active Sessions</h2>
          <span className="text-sm text-gray-400">
            {sessions.filter(s => s.is_active).length} active
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No sessions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                  <th className="pb-3">Session</th>
                  <th className="pb-3">DJ</th>
                  <th className="pb-3 text-right">Requests</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-white/5">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{session.name}</div>
                      <div className="text-xs text-gray-400">{session.slug}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-sm">{session.dj_name || '—'}</div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs">
                        {session.request_count}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-400">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyToClipboard(getSessionUrl(session.slug))}
                          className="p-1.5 rounded hover:bg-white/10"
                          title="Copy link to clipboard"
                        >
                          <Copy size={16} />
                        </button>
                        <a
                          href={getSessionUrl(session.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-white/10"
                          title="Open session"
                        >
                          <ExternalLink size={16} />
                        </a>
                        {session.is_active && (
                          <button
                            onClick={() => handleEndSession(session.id)}
                            className="p-1.5 rounded text-red-400 hover:bg-red-500/10"
                            title="End session"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
