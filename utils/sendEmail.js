const nodemailer = require('nodemailer')

const sendEmail = async (options) => {
  console.log(
    process.env.SMTP_HOST,
    process.env.SMTP_EMAIL,
    process.env.SMTP_PASSWORD,
  )
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  const message = {
    from: `OOOWAP <lw@uniquewebdesigner.com>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  }

  const info = await transporter.sendMail(message)

  console.log('Message sent: %s', info)

  console.log('Message sent: %s', info.messageId)
}

module.exports = sendEmail
