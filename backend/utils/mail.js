import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true, // Use true for port 465, false for port 587
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

export const sendOtpMail = async (to , otp) =>{
  await transporter.sendMail({
    from: process.env.EMAIL,
    to,
    subject:"reset you password",
    html: `<p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes. </p>`
  })
} 
