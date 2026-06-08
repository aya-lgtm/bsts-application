const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'project.bsts@gmail.com',
    pass: 'lkdd cvna dkvb xhrf',
  },
});

const sendResetPasswordEmail = async (email, resetUrl) => {
  const mailOptions = {
    from: '"BSTS App" <project.bsts@gmail.com>',
    to: email,
    subject: 'Réinitialisation de votre mot de passe BSTS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0D6B5E; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎓 BSTS</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Réinitialisation du mot de passe</h2>
          <p style="color: #666;">Cliquez sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #0D6B5E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">Ce lien expire dans 1 heure.</p>
        </div>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

const sendOTPEmail = async (email, otpCode) => {
  const mailOptions = {
    from: '"BSTS App" <project.bsts@gmail.com>',
    to: email,
    subject: 'Code de vérification BSTS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0D6B5E; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎓 BSTS</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; text-align: center;">
          <h2 style="color: #333;">Vérification de votre compte</h2>
          <p style="color: #666;">Voici votre code de vérification :</p>
          <div style="background: #0D6B5E; color: white; font-size: 36px; font-weight: bold; 
                      padding: 20px; border-radius: 10px; letter-spacing: 10px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p style="color: #999; font-size: 14px;">Ce code expire dans 10 minutes.</p>
          <p style="color: #999; font-size: 14px;">Si vous n'avez pas créé de compte, ignorez cet email.</p>
        </div>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetPasswordEmail, sendOTPEmail };