const axios = require('axios');

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_BASE_URL = 'https://api.daily.co/v1';

const createMeetingRoom = async (consultationId, expiresAt) => {
  try {
    const response = await axios.post(
      `${DAILY_BASE_URL}/rooms`,
      {
        name: `bsts-consultation-${consultationId}`,
        privacy: 'public',
        properties: {
          exp: Math.floor(new Date(expiresAt).getTime() / 1000),
          max_participants: 2,
          enable_chat: true,
          enable_screenshare: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.url;
  } catch (error) {
    console.error('❌ Erreur Daily.co:', error.message);
    return null;
  }
};

module.exports = { createMeetingRoom };