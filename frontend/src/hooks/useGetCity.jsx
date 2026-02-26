
import { useEffect } from 'react'
import { serverUrl } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setCity, setUserData } from '../redux/userSlice'
import axios from 'axios'


function useGetCity() {
  const dispatch = useDispatch();
  const { userData} = useSelector(state=>state.user)
  
  const apikey = import.meta.env.VITE_GEO_APIKEY
  useEffect(()=>{
    navigator.geolocation.getCurrentPosition(async (position) =>{
      console.log(position)
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apikey}`)
      console.log(result)
      dispatch(setCity(result?.data?.results[0].city))
    }) 
  }, [userData])
}

export default useGetCity
