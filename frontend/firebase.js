// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth"
 // TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY ,
  authDomain: "vingo-food-delivery-ed639.firebaseapp.com",
  projectId: "vingo-food-delivery-ed639",
  storageBucket: "vingo-food-delivery-ed639.firebasestorage.app",
  messagingSenderId: "1025062228643",
  appId: "1:1025062228643:web:42bd8207d14a0906d06516"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export {app, auth};