import { useState, useEffect } from 'react';
import socket from '../socket/socket';
import { EVENTS } from '../../../shared/events.js';

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const NotificationBanner = ({ onRequestAccepted }) => {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handleRequestIncoming = (data) => {
      setNotification(data);
      setTimeout(() => setNotification(null), 5000);
    };

    const handleRequestAccepted = (data) => {
      setNotification({
        type: 'accepted',
        message: 'Your contact request was accepted!',
        conversationId: data.conversationId,
      });
      if (onRequestAccepted) onRequestAccepted(data.conversationId);
      setTimeout(() => setNotification(null), 4000);
    };

    // Wait for socket to be connected before attaching listeners
    if (socket.connected) {
      socket.on(EVENTS.REQUEST_INCOMING, handleRequestIncoming);
      socket.on(EVENTS.REQUEST_ACCEPTED, handleRequestAccepted);
    } else {
      socket.on('connect', () => {
        socket.on(EVENTS.REQUEST_INCOMING, handleRequestIncoming);
        socket.on(EVENTS.REQUEST_ACCEPTED, handleRequestAccepted);
      });
    }

    return () => {
      socket.off(EVENTS.REQUEST_INCOMING, handleRequestIncoming);
      socket.off(EVENTS.REQUEST_ACCEPTED, handleRequestAccepted);
    };
  }, []);

  if (!notification) return null;

  return (
    <div
      className="fixed top-4 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        transform: 'translateX(-50%)',
        backgroundColor: '#141414',
        border: '0.5px solid #1E1E1E',
        borderLeft: '3px solid #7C6FCD',
        minWidth: '320px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        animation: 'slideDown 0.2s ease-out',
      }}>

      {notification.type === 'accepted' ? (
        <>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
            style={{ backgroundColor: '#0F1E35', color: '#C4B5FD' }}>
            ✓
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#E8E8E8' }}>
              Request accepted!
            </p>
            <p className="text-xs" style={{ color: '#555555' }}>
              You can now start chatting
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
            style={{ backgroundColor: '#1E1A3A', color: '#9B93E8' }}>
            {getInitials(notification.name)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#E8E8E8' }}>
              {notification.name} wants to chat
            </p>
            <p className="text-xs" style={{ color: '#555555' }}>
              Tap Requests to respond
            </p>
          </div>
        </>
      )}

      {/* Dismiss button */}
      <button
        onClick={() => setNotification(null)}
        className="text-xs ml-2"
        style={{ color: '#444444' }}>
        ✕
      </button>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBanner;