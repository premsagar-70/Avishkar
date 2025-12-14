const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
    try {
        console.log(`[MailSender] Preparing to send email to: ${email}`);
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            debug: true, // show debug output
            logger: true // log information in console
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
        return error;
    }
};

module.exports = mailSender;
