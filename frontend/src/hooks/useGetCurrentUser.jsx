import { useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { setUserData, setLoading } from "../redux/userSlice";
import { serverUrl } from "../App";

function UseGetCurrentUser() {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUser = async () => {
      dispatch(setLoading(true));
      try {
        const res = await axios.get(`${serverUrl}/api/auth/current`, {
          withCredentials: true,
        });
        // Support both new { success, data: { user } } and legacy format
        const user = res.data?.data?.user || res.data;
        dispatch(setUserData(user));
      } catch (error) {
        // If token expired, try to refresh
        if (error?.response?.status === 401 && error?.response?.data?.code === 'TOKEN_EXPIRED') {
          try {
            const refreshRes = await axios.post(`${serverUrl}/api/auth/refresh`, {}, {
              withCredentials: true,
            });
            const user = refreshRes.data?.data?.user;
            dispatch(setUserData(user));
          } catch {
            dispatch(setUserData(null));
          }
        } else {
          dispatch(setUserData(null));
        }
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchUser();
  }, [dispatch]);
}

export default UseGetCurrentUser;
