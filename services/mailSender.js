const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
    try {
        console.log(`[MailSender] Preparing to send email to: ${email}`);
        // SendGrid Configuration
        let transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
                user: 'apikey', // SendGrid requires this exact username
                pass: process.env.SENDGRID_API_KEY || process.env.MAIL_PASS, // Use SENDGRID_API_KEY if available, else fallback
            },
            debug: true,
            logger: true
        });

        let info = await transporter.sendMail({
            from: `"Aviskahr Team" <${process.env.MAIL_USER}>`,
            to: `${email}`,
            subject: `${title}`,
            html: `${body}`,
        });
        console.log(`[MailSender] Email sent successfully. MessageId: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[MailSender] Error sending email to ${email}:`, error.message);
        return null;
    }
};

const verifyConnection = async () => {
    try {
        let transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY || process.env.MAIL_PASS,
            },
        });
        await transporter.verify();
        console.log('[MailSender] Server is ready to take our messages (SendGrid)');
        return true;
    } catch (error) {
        console.error('[MailSender] Connection verification failed:', error.message);
        return false;
    }
};

module.exports = { mailSender, verifyConnection };
