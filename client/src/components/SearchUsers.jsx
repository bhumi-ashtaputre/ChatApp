import { useState } from 'react';
import api from '../api/axios';

const SearchUsers = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState({});

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim().length === 0) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/users/search?q=${value}`);
      setResults(res.data.users);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await api.post('/contact-requests', { toUserId: userId });
      setRequestSent(prev => ({ ...prev, [userId]: true }));
    } catch (err) {
      console.error('Request error:', err);
    }
  };

  // Get initials from name for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Determine what button to show for each user
  const getActionButton = (user) => {
    if (requestSent[user.id]) {
      return (
        <button
          disabled
          className="text-xs px-3 py-1 rounded-full"
          style={{ border: '0.5px solid #7C6FCD', color: '#7C6FCD' }}>
          Pending
        </button>
      );
    }

    if (user.requestStatus === 'accepted') {
      return (
        <button
          className="text-xs px-3 py-1 rounded-full"
          style={{ backgroundColor: '#C4B5FD', color: '#FFFFFF' }}>
          Message
        </button>
      );
    }

    if (user.requestStatus === 'pending') {
      return (
        <button
          disabled
          className="text-xs px-3 py-1 rounded-full"
          style={{ border: '0.5px solid #7C6FCD', color: '#7C6FCD' }}>
          {user.iSentRequest ? 'Pending' : 'Respond'}
        </button>
      );
    }

    return (
      <button
        onClick={() => handleSendRequest(user.id)}
        className="text-xs px-3 py-1 rounded-full transition-all"
        style={{ border: '0.5px solid #C4B5FD', color: '#C4B5FD' }}>
        Send Request
      </button>
    );
  };

  return (
    <div className="w-full max-w-md">
      {/* Search Input */}
      <div className="relative mb-4">
        <input
          value={query}
          onChange={handleSearch}
          placeholder="Search by name or email..."
          className="w-full h-11 rounded-full px-5 text-sm outline-none"
          style={{
            backgroundColor: '#1A1A1A',
            border: '0.5px solid #222222',
            color: '#E8E8E8',
          }}
        />
        {loading && (
          <span className="absolute right-4 top-3 text-xs"
            style={{ color: '#555555' }}>
            Searching...
          </span>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ border: '0.5px solid #1E1E1E' }}>
          {results.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                backgroundColor: '#111111',
                borderBottom: index < results.length - 1
                  ? '0.5px solid #1A1A1A'
                  : 'none',
              }}>

              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: '#0F1E35', color: '#C4B5FD' }}>
                {getInitials(user.name)}
              </div>

              {/* Name + Email */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate"
                  style={{ color: '#E8E8E8' }}>
                  {user.name}
                </p>
                <p className="text-xs truncate"
                  style={{ color: '#555555' }}>
                  {user.email}
                </p>
              </div>

              {/* Action Button */}
              {getActionButton(user)}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {query.length > 0 && results.length === 0 && !loading && (
        <p className="text-center text-sm" style={{ color: '#444444' }}>
          No users found for "{query}"
        </p>
      )}
    </div>
  );
};

export default SearchUsers;