import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from './logger.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.EMAIL,
    pass: env.PASS,
  },
});

/**
 * Send an OTP email for password reset.
 * @param {string} to - Recipient email
 * @param {string} otp - OTP code
 */
export const sendOtpMail = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: `"Vingo" <${env.EMAIL}>`,
      to,
      subject: 'Your Vingo Password Reset OTP',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #ff4d2d; margin-bottom: 8px;">Vingo</h2>
          <p style="color: #333; font-size: 16px;">Your password reset OTP is:</p>
          <div style="background: #fff3f0; border: 2px solid #ff4d2d; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #ff4d2d;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    logger.info(`OTP email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send OTP email: ${error.message}`);
    throw new Error('Failed to send OTP email');
  }
};

/**
 * Send an order confirmation email.
 * @param {string} to - Recipient email
 * @param {Object} order - Order details
 */
export const sendOrderConfirmation = async (to, order) => {
  try {
    await transporter.sendMail({
      from: `"Vingo" <${env.EMAIL}>`,
      to,
      subject: `Order #${order._id.toString().slice(-6).toUpperCase()} Confirmed!`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #ff4d2d;">Order Confirmed! 🎉</h2>
          <p>Your order has been placed successfully.</p>
          <div style="background: #f9f9f9; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p><strong>Order ID:</strong> #${order._id.toString().slice(-6).toUpperCase()}</p>
            <p><strong>Total:</strong> ₹${(order.totalAmount / 100).toFixed(2)}</p>
            <p><strong>Status:</strong> ${order.status}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Track your order in real-time on the Vingo app.</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error(`Failed to send order confirmation: ${error.message}`);
  }
};

export default transporter;
