import { Injectable } from '@angular/core';
import { auth } from '../firebase.config';
import { onAuthStateChanged, User } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {

  getCurrentUser(): Promise<User | null> {

    return new Promise((resolve) => {

      const unsubscribe = onAuthStateChanged(auth, (user) => {

        unsubscribe();

        resolve(user);

      });

    });

  }

}