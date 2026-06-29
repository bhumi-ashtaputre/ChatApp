// All Socket.io event names live here
// Both the server and client import from this file
// This way if you rename an event you only change it in one place

export const EVENTS = {
  // Client sends these to the server
  MESSAGE_SEND: 'message:send',
  MESSAGE_READ: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE_PING: 'presence:ping',

  // Server sends these to the client
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_SEEN: 'message:seen',
  USER_STATUS: 'user:status',
  TYPING_INDICATOR: 'typing:indicator',
  REQUEST_INCOMING: 'request:incoming',
  REQUEST_ACCEPTED: 'request:accepted',
  REQUEST_DECLINED: 'request:declined',
  CONVERSATION_CREATED: 'conversation:created',
}