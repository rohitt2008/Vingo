
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
        const result = await axios.get(`${serverUrl}/api/auth/current`, {
          withCredentials: true,
        });
        dispatch(setUserData(result.data))
      } catch (error) {
        dispatch(setUserData(null));
      }
    }
    fetchUser();
  }, [])
}

export default UseGetCurrentUser
