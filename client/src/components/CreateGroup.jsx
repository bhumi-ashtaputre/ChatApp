import { useState, useEffect } from 'react';
import api from '../api/axios';

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const CreateGroup = ({ onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await api.get('/contact-requests/accepted');
        setContacts(res.data.contacts);
      } catch (err) {
        console.error(err);
      }
    };
    fetchContacts();
  }, []);

  const toggleSelect = (userId) => {
    setSelected(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { setError('Please enter a group name.'); return; }
    if (selected.length < 2) { setError('Please select at least 2 people.'); return; }
    try {
      setLoading(true);
      const res = await api.post('/conversations', { name: groupName, memberIds: selected });
      onGroupCreated(res.data.conversationId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: '#E2DBF2', border: '0.5px solid #C8BDE5' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium" style={{ color: '#160A3A' }}>New Group</h2>
          <button onClick={onClose} style={{ color: '#6B5A9B' }}>✕</button>
        </div>
        <input
          value={groupName}
          onChange={e => { setGroupName(e.target.value); setError(''); }}
          placeholder="Group name..."
          className="w-full h-11 rounded-full px-4 text-sm outline-none mb-4"
          style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #C8BDE5', color: '#160A3A' }}
          autoFocus
        />
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#6B5A9B' }}>
          Select members ({selected.length} selected)
        </p>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
          {contacts.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#6B5A9B' }}>
              No contacts yet. Add people first.
            </p>
          ) : contacts.map(contact => (
            <div key={contact.id} onClick={() => toggleSelect(contact.id)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all"
              style={{
                backgroundColor: selected.includes(contact.id) ? '#D5CCEB' : '#EDE8FF',
                border: selected.includes(contact.id) ? '0.5px solid #4A2D9C' : '0.5px solid #C8BDE5',
              }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
                {getInitials(contact.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#160A3A' }}>{contact.name}</p>
                <p className="text-xs truncate" style={{ color: '#6B5A9B' }}>{contact.email}</p>
              </div>
              {selected.includes(contact.id) && <span style={{ color: '#4A2D9C' }}>✓</span>}
            </div>
          ))}
        </div>
        {error && <p className="text-xs mb-3" style={{ color: '#D85A30' }}>{error}</p>}
        <button onClick={handleCreate} disabled={loading}
          className="w-full h-11 rounded-full text-sm font-medium"
          style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </div>
  );
};

export default CreateGroup;