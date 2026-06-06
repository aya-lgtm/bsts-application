const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: 'b858a2c81d4b76',
    pass: '8586466ef90f1c',
  },
});

const sendResetPasswordEmail = async (email, resetUrl) => {
  const mailOptions = {
    from: '"BSTS App" <noreply@bsts.ma>',
    to: email,
    subject: 'Réinitialisation de votre mot de passe BSTS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0D6B5E; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎓 BSTS</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Réinitialisation du mot de passe</h2>
          <p style="color: #666;">Vous avez demandé à réinitialiser votre mot de passe.</p>
          <p style="color: #666;">Cliquez sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #0D6B5E; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-size: 16px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">Ce lien expire dans 1 heure.</p>
          <p style="color: #999; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetPasswordEmail };