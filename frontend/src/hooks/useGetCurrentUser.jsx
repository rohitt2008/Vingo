
import { useEffect } from 'react'
import { serverUrl } from '../App'
import { useDispatch } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import axios from 'axios'


function UseGetCurrentUser() {
  const dispatch = useDispatch()
  useEffect(()=>{
    const fetchUser = async () =>{
      try {
        const result = axios.post(`${serverUrl}/api/auth/current` , {withCredentials: true})
        dispatch(setUserData(result.data))
      } catch (error) {
        console.log(error)
      }
    }
    fetchUser();
  }, [])
}

export default UseGetCurrentUser
