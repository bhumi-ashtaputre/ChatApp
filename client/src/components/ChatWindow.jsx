import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import socket from '../socket/socket';
import { EVENTS } from '../../../shared/events.js';

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatWindow = ({ conversation, currentUser, onNewMessage }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!conversation) return;
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/conversations/${conversation.id}/messages`);
        setMessages(res.data.messages);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    fetchMessages();
  }, [conversation?.id]);

  useEffect(() => {
    if (!conversation) return;
    const handleNewMessage = (message) => {
      if (message.conversation_id === conversation.id) {
        setMessages(prev => [...prev, message]);
        onNewMessage && onNewMessage(conversation.id, message.content);
      }
    };
    const handleTypingIndicator = (data) => {
      if (data.conversationId === conversation.id) setIsTyping(data.typing);
    };
    socket.on(EVENTS.MESSAGE_NEW, handleNewMessage);
    socket.on(EVENTS.TYPING_INDICATOR, handleTypingIndicator);
    return () => {
      socket.off(EVENTS.MESSAGE_NEW, handleNewMessage);
      socket.off(EVENTS.TYPING_INDICATOR, handleTypingIndicator);
    };
  }, [conversation?.id]);

  const handleSend = (mediaUrl = null, mediaType = null, fileName = null) => {
    if (!input.trim() && !mediaUrl) return;
    const clientMsgId = Date.now().toString();
    const tempMessage = {
      id: clientMsgId,
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      content: input || null,
      media_url: mediaUrl,
      media_type: mediaType,
      file_name: fileName,
      created_at: new Date().toISOString(),
      is_read: false,
      pending: true,
    };
    setMessages(prev => [...prev, tempMessage]);
    onNewMessage && onNewMessage(conversation.id, input || '📎 File');
    socket.emit(EVENTS.MESSAGE_SEND, {
      conversationId: conversation.id,
      content: input || null,
      mediaUrl,
      mediaType,
      clientMsgId,
    });
    setInput('');
    socket.emit(EVENTS.TYPING_STOP, { conversationId: conversation.id });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      handleSend(res.data.url, res.data.mediaType, res.data.fileName);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!typing) {
      setTyping(true);
      socket.emit(EVENTS.TYPING_START, { conversationId: conversation.id });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socket.emit(EVENTS.TYPING_STOP, { conversationId: conversation.id });
    }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'TODAY';
    if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">

      {/* Chat Header */}
      <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ backgroundColor: '#D5CCEB', borderBottom: '0.5px solid #C8BDE5' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
          style={{ backgroundColor: '#4A2D9C', color: '#FFFFFF' }}>
          {getInitials(conversation.name)}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: '#160A3A' }}>
            {conversation.name}
          </p>
          <p className="text-xs" style={{ color: '#4A2D9C' }}>
            {isTyping ? 'typing...' : 'online'}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2"
        style={{ backgroundColor: '#EDE8FF' }}>
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex items-center justify-center my-3">
              <span className="text-xs px-3 py-1 rounded-full"
                style={{ backgroundColor: '#D5CCEB', border: '0.5px solid #C8BDE5', color: '#6B5A9B' }}>
                {getDateLabel(date)}
              </span>
            </div>
            {msgs.map((message) => {
              const isMine = message.sender_id === currentUser.id;
              return (
                <div key={message.id}
                  className={`flex mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="text-sm max-w-xs lg:max-w-md"
                    style={message.media_url && message.media_type === 'image' ? {
                      backgroundColor: 'transparent',
                    } : isMine ? {
                      backgroundColor: '#4A2D9C',
                      color: '#FFFFFF',
                      opacity: message.pending ? 0.7 : 1,
                      padding: '8px 16px',
                      borderRadius: '999px',
                    } : {
                      backgroundColor: '#FFFFFF',
                      border: '0.5px solid #C8BDE5',
                      color: '#160A3A',
                      padding: '8px 16px',
                      borderRadius: '999px',
                    }}>
                    {message.media_url && message.media_type === 'image' && (
                      <img
                        src={message.media_url}
                        alt="shared"
                        className="rounded-2xl max-w-xs mb-1 cursor-pointer"
                        style={{ maxHeight: '200px', objectFit: 'cover' }}
                        onClick={() => window.open(message.media_url, '_blank')}
                      />
                    )}
                    {message.media_url && message.media_type === 'file' && (
                      <a href={message.media_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 underline text-xs mb-1">
                        📎 {message.file_name || 'Download file'}
                      </a>
                    )}
                    {message.content}
                    <span className="text-xs ml-2"
                      style={{ color: isMine ? 'rgba(255,255,255,0.6)' : '#6B5A9B' }}>
                      {formatTime(message.created_at)}
                      {isMine && <span className="ml-1">{message.pending ? ' ✓' : ' ✓✓'}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-full text-sm"
              style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #C8BDE5', color: '#6B5A9B' }}>
              typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: '#D5CCEB', borderTop: '0.5px solid #C8BDE5' }}>
        <div className="flex-1 flex items-center rounded-full px-4 h-10"
          style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #C8BDE5' }}>
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: '#160A3A' }}
          />
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
        />
        <button onClick={() => fileInputRef.current?.click()} style={{ color: '#6B5A9B' }}>
          📎
        </button>
        <button
          onClick={() => handleSend()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#4A2D9C' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;