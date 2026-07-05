import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  register(email: string, password: string) {
    return createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
  }

  async login(email: string, password: string) {

  await setPersistence(
    auth,
    browserLocalPersistence
  );

  return signInWithEmailAndPassword(
    auth,
    email,
    password
  );
}
  logout() {
    return signOut(auth);
  }
}