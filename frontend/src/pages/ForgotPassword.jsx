import React from 'react'
import axios from 'axios';
import { useState } from 'react';
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { ClipLoader } from 'react-spinners';
import { useDispatch } from 'react-redux';
function ForgotPassword() {
  const [step , setStep] = useState(1);
  const [email , setEmail] = useState("");
  const [otp , setOtp] = useState("");
  const [newPassword ,setNewPassword] = useState("");
  const [confirmPassword ,setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const [err , setErr] = useState();
  const [loading , setLoading] = useState(false);
  
  const handleSendOtp = async () =>{
    setLoading(true);
    try {
      const result = await axios.post(`${serverUrl}/api/auth/send-otp` , {email}, {withCredentials: true})
      console.log(result);
      setErr("");
      setStep(2);
      setLoading(false)
    } catch (error) {
      setErr(error?.response?.data?.message);
      setLoading(false)
    }
  }
  const handleVerifyOtp = async () =>{
    setLoading(true)
    try {
      const result = await axios.post(`${serverUrl}/api/auth/verify-otp` , {email, otp}, {withCredentials: true})
      console.log(result);
      setErr("")
      setStep(3);
      setLoading(false);
    } catch (error) {
      setErr(error?.response?.data?.message);
      setLoading(false)
    }
  }
  const handleResetPassword = async () =>{
    setLoading(true)
    if(newPassword != confirmPassword) return null;
    try {
      const result = await axios.post(`${serverUrl}/api/auth/reset-password` , {email, newPassword}, {withCredentials: true})
      console.log(result);
      setErr("");
      navigate("/signin");
      setLoading(false)
    } catch (error) {
      setErr(error?.response?.data?.message);
      setLoading(false);
    }
  }
  return (
    <div className='flex w-full items-center justify-center min-h-screen p-4 bg-[#fff9f6]'>
      <div className='bg-white rounded-xl shadow-lg w-full max-w-md p-8'>
        <div className='flex items-center gap-4 mb-4'>
          <IoIosArrowRoundBack size={30} className='text-[#ff4d2d] cursor-pointer' onClick={()=> navigate('/signin')} />
          <h1 className='text-2xl font-bold text-center text-[#ff4d2d]'>Forgot Password</h1>  
        </div>
        {step == 1 && 
          <div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray 700 font-medium mb-1">Email</label>
              <input type="email" className='w-full border-[1px] border-gray-200 rounded-lg px-3 py-2 focus: outline-none' placeholder="Enter your Email"  onChange={(e)=>setEmail(e.target.value)} value={email} required/>
            </div>
            <button onClick={handleSendOtp} className={`w-full font-semibold py-2 rounded-lg transition duration-200 hover:bg-[#e64323] text-white bg-[#ff4d2d]  cursor-pointer`} disabled={loading} >
            {loading? <ClipLoader color='white' size={20}/>: "Send OTP"}
          </button>
          {err && <p className="text-red-500 text-center my-[10px]">{err}</p> }
          </div>
        }
        {step == 2 && 
          <div>
            <div className="mb-4">
              <label htmlFor="otp" className="block text-gray 700 font-medium mb-1">OTP</label>
              <input type="email" className='w-full border-[1px] border-gray-200 rounded-lg px-3 py-2 focus: outline-none' placeholder="Enter OTP"  onChange={(e)=>setOtp(e.target.value)} value={otp} required/>
            </div>
            <button onClick={handleVerifyOtp} className={`w-full font-semibold py-2 rounded-lg transition duration-200 hover:bg-[#e64323] text-white bg-[#ff4d2d]  cursor-pointer`} disabled={loading} >
            {loading? <ClipLoader color='white' size={20}/>: "Verify"}
          </button>
          {err && <p className="text-red-500 text-center my-[10px]">{err}</p> }
          </div>
        }
        {step == 3 && 
          <div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray 700 font-medium mb-1">New Password</label>
              <input type="email" className='w-full border-[1px] border-gray-200 rounded-lg px-3 py-2 focus: outline-none' placeholder="Enter new password"  onChange={(e)=>setNewPassword(e.target.value)} value={newPassword} required/>
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-gray 700 font-medium mb-1">Confirm Password</label>
              <input type="email" className='w-full border-[1px] border-gray-200 rounded-lg px-3 py-2 focus: outline-none' placeholder="Confirm new password"  onChange={(e)=>setConfirmPassword(e.target.value)} value={confirmPassword} required/>
            </div>
            <button onClick={handleResetPassword} className={`w-full font-semibold py-2 rounded-lg transition duration-200 hover:bg-[#e64323] text-white bg-[#ff4d2d]  cursor-pointer`} disabled={loading} >
            {loading? <ClipLoader color='white' size={20}/>: "Reset Password"}
          </button>
          {err && <p className="text-red-500 text-center my-[10px]">{err}</p> }
          
          </div>
        }
      </div>
    </div>
  )
}

export default ForgotPassword
