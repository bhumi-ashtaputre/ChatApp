import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import FindPeople from '../components/FindPeople';
import RequestsPanel from '../components/RequestsPanel';
import ChatWindow from '../components/ChatWindow';
import socket from '../socket/socket';
import NotificationBanner from '../components/NotificationBanner';
import CreateGroup from '../components/CreateGroup';
import Settings from '../pages/Settings';

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const ComposeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const PeopleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const ConversationItem = ({ convo, active, onClick }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
      style={{
        backgroundColor: active ? '#C8BDE5' : 'transparent',
        borderLeft: active ? '3px solid #4A2D9C' : '3px solid transparent',
        borderBottom: '0.5px solid #C8BDE5',
      }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
        style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
        {convo.isGroup ? '👥' : getInitials(convo.name || '')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium truncate" style={{ color: '#160A3A' }}>
            {convo.name}
          </p>
          <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#6B5A9B' }}>
            {formatTime(convo.lastMessageTime)}
          </span>
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: '#6B5A9B' }}>
          {convo.lastMessage}
        </p>
      </div>
      {convo.unreadCount > 0 && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
          style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
          {convo.unreadCount}
        </div>
      )}
    </div>
  );
};

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [activeConvo, setActiveConvo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFindPeople, setShowFindPeople] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get('/conversations');
        setConversations(res.data.conversations);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    const fetchRequestCount = async () => {
      try {
        const res = await api.get('/contact-requests/pending');
        setRequestCount(res.data.requests.length);
      } catch (err) {
        console.error('Failed to load request count:', err);
      }
    };
    fetchRequestCount();
  }, []);

  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, []);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: '#EDE8FF' }}>

      {/* LEFT SIDEBAR */}
      <div className="flex flex-col w-80 flex-shrink-0 h-full"
        style={{ backgroundColor: '#E2DBF2', borderRight: '0.5px solid #C8BDE5' }}>

        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-4"
          style={{ backgroundColor: '#D5CCEB', borderBottom: '0.5px solid #C8BDE5' }}>
          <div>
            <h1 className="text-base font-medium tracking-tight" style={{ color: '#160A3A' }}>ChatApp</h1>
            <p className="text-xs" style={{ color: '#6B5A9B' }}>{user?.name}</p>
          </div>
          <button onClick={() => setShowSettings(true)} style={{ color: '#4A2D9C' }}>
            <SettingsIcon />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 rounded-full px-3 h-9"
            style={{ backgroundColor: '#EDE8FF', border: '0.5px solid #C8BDE5' }}>
            <span style={{ color: '#6B5A9B' }}><SearchIcon /></span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 text-xs bg-transparent outline-none"
              style={{ color: '#160A3A' }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 px-3 pb-3">
          {['all', 'unread', 'requests'].map(tab => (
            <button key={tab} onClick={() => {
              setActiveTab(tab);
              if (tab === 'requests') setRequestCount(0);
            }}
              className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-all flex items-center gap-1"
              style={{
                backgroundColor: activeTab === tab ? '#4A2D9C' : '#EDE8FF',
                color: activeTab === tab ? '#FFFFFF' : '#6B5A9B',
                border: activeTab === tab ? 'none' : '0.5px solid #C8BDE5',
              }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'requests' && requestCount > 0 && (
                <span className="w-4 h-4 rounded-full text-xs flex items-center justify-center"
                  style={{ backgroundColor: '#FFFFFF', color: '#4A2D9C' }}>
                  {requestCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map(convo => (
            <ConversationItem
              key={convo.id}
              convo={convo}
              active={activeConvo?.id === convo.id}
              onClick={() => {
                setActiveConvo(convo);
                setConversations(prev => prev.map(c =>
                  c.id === convo.id ? { ...c, unreadCount: 0 } : c
                ));
              }}
            />
          ))}
        </div>

        {/* Bottom */}
        <div style={{ borderTop: '0.5px solid #C8BDE5' }}>
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: '#D5CCEB' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
              {getInitials(user?.name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#160A3A' }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: '#6B5A9B' }}>{user?.email}</p>
            </div>
            <button onClick={handleLogout}
              className="text-xs px-2 py-1 rounded-full"
              style={{ color: '#D85A30', border: '0.5px solid #D85A30' }}>
              Logout
            </button>
          </div>
          <div className="px-3 pb-4 pt-2" style={{ backgroundColor: '#D5CCEB' }}>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFindPeople(true)}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
                <ComposeIcon />
                Add
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#EDE8FF', color: '#4A2D9C', border: '0.5px solid #4A2D9C' }}>
                👥 Group
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: '#EDE8FF' }}>
        {showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : activeTab === 'requests' ? (
          <RequestsPanel onRequestAccepted={async (conversationId) => {
            const res = await api.get('/conversations');
            setConversations(res.data.conversations);
            setActiveTab('all');
            const newConvo = res.data.conversations.find(c => c.id === conversationId);
            if (newConvo) setActiveConvo(newConvo);
          }} />
        ) : activeConvo ? (
          <ChatWindow
            conversation={activeConvo}
            currentUser={user}
            onNewMessage={(conversationId, content) => {
              setConversations(prev => prev.map(c =>
                c.id === conversationId
                  ? { ...c, lastMessage: content, lastMessageTime: new Date().toISOString() }
                  : c
              ));
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div style={{ color: '#C8BDE5' }}><PeopleIcon /></div>
            <p className="text-lg" style={{ color: '#6B5A9B' }}>Select a conversation</p>
            <p className="text-sm" style={{ color: '#9B8EC4' }}>or find someone new to chat with</p>
            <button
              onClick={() => setShowFindPeople(true)}
              className="px-6 py-2 rounded-full text-sm font-medium mt-2"
              style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
              Find People
            </button>
          </div>
        )}
      </div>

      {/* NOTIFICATION BANNER */}
      <NotificationBanner
        onRequestAccepted={(conversationId) => {
          api.get('/conversations').then(res => {
            setConversations(res.data.conversations);
          });
        }}
      />

      {showFindPeople && (
        <FindPeople onClose={() => setShowFindPeople(false)} />
      )}

      {showCreateGroup && (
        <CreateGroup
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={async (conversationId) => {
            const res = await api.get('/conversations');
            setConversations(res.data.conversations);
            const newConvo = res.data.conversations.find(c => c.id === conversationId);
            if (newConvo) setActiveConvo(newConvo);
          }}
        />
      )}
    </div>
  );
};

export default Home;