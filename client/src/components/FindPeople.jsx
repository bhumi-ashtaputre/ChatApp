import { useState } from 'react';
import api from '../api/axios';

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const FindPeople = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState({});

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim().length === 0) { setResults([]); return; }
    try {
      setLoading(true);
      const res = await api.get(`/users/search?q=${value}`);
      setResults(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await api.post('/contact-requests', { toUserId: userId });
      setRequestSent(prev => ({ ...prev, [userId]: true }));
    } catch (err) {
      console.error(err);
    }
  };

  const getActionButton = (user) => {
    if (requestSent[user.id]) {
      return (
        <button disabled className="text-xs px-3 py-1 rounded-full"
          style={{ border: '0.5px solid #6B5A9B', color: '#6B5A9B' }}>
          Pending
        </button>
      );
    }
    if (user.requestStatus === 'accepted') {
      return (
        <button className="text-xs px-3 py-1 rounded-full"
          style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
          Message
        </button>
      );
    }
    if (user.requestStatus === 'pending') {
      return (
        <button disabled className="text-xs px-3 py-1 rounded-full"
          style={{ border: '0.5px solid #6B5A9B', color: '#6B5A9B' }}>
          {user.iSentRequest ? 'Pending' : 'Respond'}
        </button>
      );
    }
    return (
      <button onClick={() => handleSendRequest(user.id)}
        className="text-xs px-3 py-1 rounded-full transition-all"
        style={{ border: '0.5px solid #4A2D9C', color: '#4A2D9C' }}>
        Send Request
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: '#E2DBF2', border: '0.5px solid #C8BDE5' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium" style={{ color: '#160A3A' }}>Find People</h2>
          <button onClick={onClose} style={{ color: '#6B5A9B' }}>✕</button>
        </div>
        <div className="flex items-center gap-2 rounded-full px-4 h-11 mb-4"
          style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #C8BDE5' }}>
          <input
            value={query}
            onChange={handleSearch}
            placeholder="Search by name or email..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: '#160A3A' }}
            autoFocus
          />
          {loading && <span className="text-xs" style={{ color: '#6B5A9B' }}>...</span>}
        </div>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {results.map(user => (
            <div key={user.id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{ backgroundColor: '#EDE8FF', border: '0.5px solid #C8BDE5' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#160A3A' }}>{user.name}</p>
                <p className="text-xs truncate" style={{ color: '#6B5A9B' }}>{user.email}</p>
              </div>
              {getActionButton(user)}
            </div>
          ))}
          {query.length > 0 && results.length === 0 && !loading && (
            <p className="text-center text-sm py-4" style={{ color: '#6B5A9B' }}>
              No users found for "{query}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindPeople;