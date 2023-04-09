// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAV8vn-eW2Kdm-gIWvSVc3gvV-2qybfcgA",
  authDomain: "timebalancer.firebaseapp.com",
  projectId: "timebalancer",
  storageBucket: "timebalancer.appspot.com",
  messagingSenderId: "412528161146",
  appId: "1:412528161146:web:54fd22cc7f6fd1da4f26c3",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore();
