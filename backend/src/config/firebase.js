const admin = require('firebase-admin');

if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: "bsts-e9a70",
      private_key_id: "d4aedc758e0a0ffee99cae18c5dee06e65ca7245",
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: "firebase-adminsdk-fbsvc@bsts-e9a70.iam.gserviceaccount.com",
      client_id: "109453596494197535925",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bsts-e9a70.iam.gserviceaccount.com",
    }),
  });
}

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const message = {
      notification: { title, body },
      data,
      token: fcmToken,
    };
    const response = await admin.messaging().send(message);
    console.log('✅ Notification push envoyée :', response);
    return response;
  } catch (error) {
    console.error('❌ Erreur notification push :', error.message);
  }
};

module.exports = { admin, sendPushNotification };