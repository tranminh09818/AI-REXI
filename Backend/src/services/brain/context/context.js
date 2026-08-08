/**
 * AI REXI BRAIN — CONTEXT ENGINE (Phase 4: Context Engine)
 *
 * Theo dõi ngữ cảnh phiên chat, tracking topics, detect topic transition.
 *
 * Store: JSON file on disk.
 *
 * Chi phí: local.
 */

const fs = require('fs');
const path = require('path');
const { tokenize, removeDiacritics } = require('../nlp/tokenizer-utils');
const { extractEntities } = require('../nlp/entity-extractor');

const DB_DIR = path.join(__dirname, '..', '..', '..', 'Database');
const SESSION_FILE = path.join(DB_DIR, 'sessions.json');

const MAX_SESSIONS = 50;

function getSessions() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

function createSession(userId) {
  const sessions = getSessions();
  if (!sessions[userId]) {
    sessions[userId] = {
      created: Date.now(),
      last_message: null,
      messages: [],
      topics: [],
      last_topic: null
    };
    saveSessions(sessions);
    return sessions[userId];
  }
  return sessions[userId];
}

function detectTopic(text) {
  const phrases = [
    'xin chao', 'hello', 'chao', 'hello',
    'tien la', 'bien', 'ha noi', 'ha noi',
    'tôi', 'ben', 'ta', 'em', 'ban',
    'xin than', 'xin loi', 'xin lam',
    'khong', 'co', 'coi',
    'nhi thi', 'nhi thi', 'co the', 'cau mot',
    'thong tin', 'them', 'nha',
    'coi', 'chi', 'cau', 'them',
    'them', 'cau truc', 'can', 'chuyen',
    'cau ho', 'gi up', 'gi up', 'gi up', 'gip', 'gi up'
  ];
  const text_lower = text.toLowerCase();
  for (const phrase of phrases) {
    if (text_lower.includes(phrase)) return phrase;
  }
  return null;
}

function updateTopic(sessions, message) {
  const session = sessions[message.userId];
  if (!session) return null;
  const topic = detectTopic(message.text);
  if (topic) {
    if (!session.topics.includes(topic)) {
      session.topics.push(topic);
    }
    session.last_topic = topic;
    session.last_message = message.text;
    session.last_message_time = Date.now();
    saveSessions(sessions);
    return topic;
  }
  return null;
}

function buildContext(userId, latestMessages) {
  const sessions = getSessions();
  const session = sessions[userId];
  if (!session) return { conversation: [], topic: null, entities: [], memory: [] };

  const recent = (latestMessages || []).slice(-8);
  const topic = session.last_topic || null;

  return {
    conversation: recent,
    topic: topic,
    entity: {
      name: latestMessages.find(m => m.entities && m.entities.name)?.entities?.name || null,
      job: latestMessages.find(m => m.entities && m.entities.job)?.entities?.job || null,
      company: latestMessages.find(m => m.entities && m.entities.company)?.entities?.company || null,
      location: latestMessages.find(m => m.entities && m.entities.location)?.entities?.location || null,
    },
    metadata: {
      messageCount: session.messages.length,
      lastTopic: topic,
      sessionCreated: session.created,
      lastMessageTime: session.last_message_time
    }
  };
}

module.exports = {
  getSessions,
  saveSessions,
  createSession,
  detectTopic,
  updateTopic,
  buildContext
};