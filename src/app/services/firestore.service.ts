import { Injectable } from '@angular/core';

import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

import { db } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  async saveUser(
    uid: string,
    name: string,
    email: string
  ) {

    await setDoc(
      doc(db, 'users', uid),
      {
        name,
        email,
        createdAt: new Date()
      }
    );
  }

  async getUser(uid: string) {

    const snapshot = await getDoc(
      doc(db, 'users', uid)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data();
  }

  async getUserScores(uid: string) {

    const snapshot = await getDoc(
      doc(db, 'scores', uid)
    );

    if (!snapshot.exists()) {
      return {};
    }

    return snapshot.data();
  }

}