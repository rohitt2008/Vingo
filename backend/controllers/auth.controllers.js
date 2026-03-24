import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import genToken from "../utils/token.js";
import { sendOtpMail } from "../utils/mail.js";
export const signUp = async (req, res) =>{
  try {
    const {fullName , email, password , mobile , role} = req.body;
    let user = await User.findOne({email})
    if(user){
      return res.status(400).json({message: "User already exists"});
    }
    if(password.length < 6){
      return res.status(400).json({message: "Password must be at least 6 characters long"});
    }
    if(mobile.length < 10){
      return res.status(400).json({message: "mobile number must be atleast 10 digits"});
    }
    const hashedPassword = await bcrypt.hash(password , 10);
    user = await User.create({
      fullName,
      email,
      mobile,
      role,
      password: hashedPassword
    })

    const token = genToken(user._id);
    res.cookie("token" , token, {
      secure: false,
      sameSite: "strict", 
      maxAge : 7*24*60*60*1000,
      httpOnly: true
    })

    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json(`sign up error ${error}`);
  }
}

export const signIn = async (req, res) =>{
  try {
    const {  email, password } = req.body;
    const user = await User.findOne({email})
    if(!user){
      return res.status(400).json({message: "User not exists"});
    }
    const isMatch = await bcrypt.compare(password , user.password);

    if(!isMatch) {
      return res.status(400).json({message: "incorrect password"});
    }

    const token = genToken(user._id);
    res.cookie("token" , token, {
      secure: false,
      sameSite: "strict", 
      maxAge : 7*24*60*60*1000,
      httpOnly: true
    })

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json(`sign In error ${error}`);
  }
}

export const signOut = async (req , res) =>{
  try {
    res.clearCookie("token");
    return res.status(200).json({message: "log out successfully "});
  } catch (error) {
    return res.status(500).json(`log out error ${error}`);
  }
}

export const sendOtp = async (req , res) =>{
  try {
    const {email } = req.body;
    const user = await User.findOne({email});
    if(!user){
      return res.status(400).json({message: "User not exists"});
    }
    const otp=Math. floor (1000 + Math. random() * 9000). toString()
    user.resetOtp = otp;
    user.otpExpires = Date.now()+5*60*1000;
    user.isOtpVerified = false;
    await user.save();
    await sendOtpMail(user.email , otp);
    return res.status(200).json({message: "otp sent sucessfully"});
  } catch (error) {
    return res.status(500).json(`otp sending error ${error}`);
  }
}

export const verifyOtp = async (req , res) =>{
  try {
    const {email , otp} = req.body;
    const user = await User.findOne({email});
    if(!user || user.resetOtp != otp || user.otpExpires < Date.now()){
      return res.status(400).json({message: "invalid or expired otp"})
    }
    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return res.status(200).json({message: "otp verified sucessfully"})
  } catch (error) {
    return res.status(500).json(`otp verifying error ${error}`);
  }
}

export const resetPassword = async (req , res) =>{
  try {
    const {email , newPassword} = req.body;
    const user = await User.findOne({email})
    if(!user || !user.isOtpVerified){
      return res.status(400).json({message: "User not exists"});
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.isOtpVerified = false;
    await user.save();
    return res.status(200).json({message: "password reset sucessfully"});
  } catch (error) {
    return res.status(500).json(`reset password error ${error}`);
  }
  
}

export const googleAuth = async (req , res) =>{
  try {
    const {fullName , email , mobile, role} = req.body;
    if(!email){
      return res.status(400).json({message: "Email is required"});
    }

    let user = await User.findOne({email});

    if(!user){
      // For first-time Google auth, required profile fields must be provided.
      if(!fullName || !mobile || !role){
        return res.status(400).json({
          message: "Please complete Google sign up with full name, mobile and role",
        });
      }

      user = await User.create({
        fullName,
        email,
        mobile,
        role
      });
    }

    const token = genToken(user._id);
    res.cookie("token" , token ,{
      secure: false, sameSite: "strict", maxAge: 7*24*60*60*1000, httpOnly: true
    })
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json(`google auth error ${error}`);
  }
  
}