import { useState, useEffect } from 'react';
import api from '../api/axios';

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const RequestsPanel = ({ onRequestAccepted }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState({});

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/contact-requests/pending');
        setRequests(res.data.requests);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleAccept = async (requestId) => {
    if (accepting[requestId]) return;
    setAccepting(prev => ({ ...prev, [requestId]: true }));
    try {
      const res = await api.patch(`/contact-requests/${requestId}`, { status: 'accepted' });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (onRequestAccepted) onRequestAccepted(res.data.conversationId);
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
      setAccepting(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDecline = async (requestId) => {
    try {
      await api.patch(`/contact-requests/${requestId}`, { status: 'declined' });
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: '#6B5A9B' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#EDE8FF' }}>
      <h2 className="text-lg font-medium mb-2" style={{ color: '#160A3A' }}>Pending Requests</h2>
      <p className="text-sm mb-6" style={{ color: '#6B5A9B' }}>
        Review people who want to connect with you.
      </p>
      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-sm" style={{ color: '#6B5A9B' }}>No pending requests</p>
          <p className="text-xs" style={{ color: '#9B8EC4' }}>
            When someone sends you a request it will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {requests.map(request => (
            <div key={request.id} className="rounded-xl p-4"
              style={{ backgroundColor: '#E2DBF2', border: '0.5px solid #C8BDE5' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                  style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
                  {getInitials(request.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#160A3A' }}>{request.name}</p>
                  <p className="text-xs truncate" style={{ color: '#6B5A9B' }}>{request.email}</p>
                </div>
              </div>
              <p className="text-xs mb-4" style={{ color: '#6B5A9B' }}>
                wants to start a conversation with you
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(request.id)}
                  disabled={accepting[request.id]}
                  className="flex-1 py-2 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: accepting[request.id] ? '#6B5A9B' : '#4A2D9C',
                    color: '#FFFFFF',
                    opacity: accepting[request.id] ? 0.7 : 1,
                  }}>
                  {accepting[request.id] ? 'Accepting...' : '✓ Accept'}
                </button>
                <button
                  onClick={() => handleDecline(request.id)}
                  className="py-2 px-4 rounded-full text-xs"
                  style={{ border: '0.5px solid #C8BDE5', color: '#6B5A9B' }}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestsPanel;