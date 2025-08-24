import nodemailer from "nodemailer";

export function mailer() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

export function sendConfirmationEmail(email, code) {
  const t = mailer();
  return t.sendMail({
    from: `"MDXX Pro" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "MDXX Pro – Verify your email",
    text: `Your verification code is: ${code}`,
    html: `<p>Your verification code is: <b>${code}</b></p>`
  });
}
