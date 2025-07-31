import nodemailer from 'nodemailer';

// Create a test account on Ethereal
export const createTestAccount = async () => {
  const testAccount = await nodemailer.createTestAccount();
  console.log('Ethereal test account created:');
  console.log(`User: ${testAccount.user}`);
  console.log(`Pass: ${testAccount.pass}`);
  console.log(`Preview URL: ${nodemailer.getTestMessageUrl({})} `);
  return testAccount;
};

// Create a transporter object using the Ethereal account
export const createTransporter = (auth) => {
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth,
  });
};

// Send mail function
export const sendMail = async (transporter, mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
};
