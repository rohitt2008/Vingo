import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/forgotPassword'
import { useSelector } from 'react-redux'
import Home from './pages/Home'
import UseGetCurrentUser from './hooks/useGetCurrentUser'
import useGetCity from './hooks/useGetCity'
import SearchResults from './pages/SearchResults'
import RestaurantPage from './pages/RestaurantPage'
import Checkout from './pages/Checkout'
import OrderHistory from './pages/OrderHistory'
import Wallet from './pages/Wallet'
import AdminDashboard from './pages/AdminDashboard'

export const serverUrl = "http://localhost:3004"

function App() {
  UseGetCurrentUser()
  useGetCity()
  const {userData} = useSelector(state=> state.user)
  return (
    <Routes>
      <Route path='/signup'  element={!userData?<SignUp/>:<Navigate to={"/"}/>} />
      <Route path='/signin'  element={!userData?<SignIn/>:<Navigate to={"/"}/>} />
      <Route path='/forgot-password'  element={!userData?<ForgotPassword/>:<Navigate to={"/"}/>} />
      <Route path='/restaurants' element={userData ? <SearchResults /> : <Navigate to="/signin" />} />
      <Route path='/restaurant/:id' element={userData ? <RestaurantPage /> : <Navigate to="/signin" />} />
      <Route path='/checkout' element={userData ? <Checkout /> : <Navigate to="/signin" />} />
      <Route path='/orders' element={userData ? <OrderHistory /> : <Navigate to="/signin" />} />
      <Route path='/wallet' element={userData ? <Wallet /> : <Navigate to="/signin" />} />
      <Route path='/admin' element={userData && userData.role === 'admin' ? <AdminDashboard /> : <Navigate to="/signin" />} />
      <Route path='/'  element={userData?<Home/>:<Navigate to={"/signin"}/> } />
      <Route path='*' element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
