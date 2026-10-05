import nodemailer from "nodemailer";

// Send an HTML email. Throws if mail credentials are missing or sending fails.
export const mailSender = async (email, subject, html) => {
  const user = process.env.MAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.MAIL_PASS || process.env.EMAIL_PASS;
  const host = process.env.MAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.MAIL_PORT) || 587;

  if (!user || !pass) {
    throw new Error(
      "Email delivery credentials not configured. Please set MAIL_USER and MAIL_PASS in backend/.env with your Gmail address and 16-character Google App Password."
    );
  }

  const isGmail = host.includes("gmail") || user.endsWith("@gmail.com");
  const transporter = nodemailer.createTransport(
    isGmail ? { service: "gmail", auth: { user, pass } } : { host, port, secure: port === 465, auth: { user, pass } }
  );

  const info = await transporter.sendMail({
    from: `"Anugrah Mentorship" <${user}>`,
    to: email,
    subject,
    html,
  });

  console.log(`[Email Sent] To: ${email} | Message ID: ${info.messageId}`);
  return info;
};

// HTML body for the signup verification code email
export const otpEmailTemplate = (otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background-color: #0c0d10; color: #f8fafc; padding: 32px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.25);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #fbbf24; margin: 0; font-size: 26px; letter-spacing: -0.5px;">Anugrah</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Mentorship & Guidance Platform</p>
    </div>

    <div style="background-color: #17191e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 24px; text-align: center;">
      <h2 style="color: #f8fafc; font-size: 18px; margin: 0 0 12px 0;">Verify Your Email Address</h2>
      <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">
        Thank you for joining Anugrah. Please use the verification code below to complete your registration:
      </p>

      <div style="display: inline-block; background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%); border: 1px solid #f59e0b; padding: 14px 32px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #fbbf24; margin-bottom: 20px;">
        ${otp}
      </div>

      <p style="color: #ef4444; font-size: 13px; margin: 0 0 6px 0;">
        ⏳ This code is valid for <strong>5 minutes</strong> only.
      </p>
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        If you did not request this email, please ignore it or contact support.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px; color: #64748b; font-size: 12px;">
      &copy; ${new Date().getFullYear()} Anugrah Platform. All rights reserved.
    </div>
  </div>
`;
