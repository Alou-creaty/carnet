import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB_Bt1RjWDg2rmBzcB703pWDZhbim1O_pU",
  authDomain: "carnet-todo-925e8.firebaseapp.com",
  projectId: "carnet-todo-925e8",
  storageBucket: "carnet-todo-925e8.firebasestorage.app",
  messagingSenderId: "80404320490",
  appId: "1:80404320490:web:ece316715ee740c9fb4793",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export default app;
