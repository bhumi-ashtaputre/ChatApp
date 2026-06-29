import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const Settings = ({ onClose }) => {
  const { user, login } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name cannot be empty.'); return; }
    try {
      setLoading(true);
      const res = await api.patch('/users/me', { name });
      login(res.data.user);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ backgroundColor: '#EDE8FF' }}>
      <div className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
        style={{ backgroundColor: '#D5CCEB', borderBottom: '0.5px solid #C8BDE5' }}>
        <button onClick={onClose} style={{ color: '#4A2D9C' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h2 className="text-base font-medium" style={{ color: '#160A3A' }}>Settings</h2>
      </div>

      <div className="flex flex-col items-center px-6 py-8 gap-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium"
          style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF', border: '2px solid #C8BDE5' }}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
          ) : getInitials(user?.name || '')}
        </div>

        {editing ? (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <label className="text-xs uppercase tracking-wider" style={{ color: '#6B5A9B' }}>Display Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-11 rounded-xl px-4 text-sm outline-none"
              style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #4A2D9C', color: '#160A3A' }}
            />
            {error && <p className="text-xs" style={{ color: '#D85A30' }}>{error}</p>}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={loading}
                className="flex-1 h-10 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setName(user?.name || ''); setError(''); }}
                className="flex-1 h-10 rounded-full text-sm"
                style={{ border: '0.5px solid #C8BDE5', color: '#6B5A9B' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xl font-medium" style={{ color: '#160A3A' }}>{user?.name}</p>
            <p className="text-sm mt-1" style={{ color: '#6B5A9B' }}>{user?.email}</p>
            {success && <p className="text-xs mt-2" style={{ color: '#4A2D9C' }}>Profile updated!</p>}
            <button onClick={() => setEditing(true)}
              className="mt-3 text-sm px-4 py-1 rounded-full"
              style={{ color: '#4A2D9C', border: '0.5px solid #4A2D9C' }}>
              Edit profile
            </button>
          </div>
        )}

        <div className="w-full max-w-sm">
          {[
            { header: 'Account', items: [{ icon: '🔒', label: 'Privacy' }, { icon: '🔔', label: 'Notifications' }, { icon: '🚫', label: 'Blocked Users' }] },
            { header: 'App', items: [{ icon: '🎨', label: 'Appearance' }, { icon: '💾', label: 'Storage' }] },
            { header: 'About', items: [{ icon: '❓', label: 'Help' }, { icon: '📄', label: 'Terms of Service' }] },
          ].map(group => (
            <div key={group.header} className="mb-4">
              <p className="text-xs uppercase tracking-wider mb-2 px-1" style={{ color: '#6B5A9B' }}>
                {group.header}
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid #C8BDE5' }}>
                {group.items.map((item, i, arr) => (
                  <div key={item.label}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:opacity-80"
                    style={{
                      backgroundColor: '#E2DBF2',
                      borderBottom: i < arr.length - 1 ? '0.5px solid #C8BDE5' : 'none',
                    }}
                    onClick={() => alert(`${item.label} — coming soon!`)}>
                    <span className="text-base">{item.icon}</span>
                    <p className="flex-1 text-sm" style={{ color: '#160A3A' }}>{item.label}</p>
                    <span style={{ color: '#6B5A9B' }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid #C8BDE5' }}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              style={{ backgroundColor: '#E2DBF2' }}>
              <span className="text-base">🚪</span>
              <p className="flex-1 text-sm" style={{ color: '#D85A30' }}>Sign Out</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;