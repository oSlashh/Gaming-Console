import { Injectable } from '@angular/core';

import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class ScoreService {

  constructor() {}

  async saveScore(
    uid: string,
    game: string,
    score: number
  ) {

    const scoreRef = doc(db, 'scores', uid);

    const snap = await getDoc(scoreRef);

    let data: any = {};

    if (snap.exists()) {
      data = snap.data();
    }

    const previous = data[game] || {
      bestScore: 0,
      totalGames: 0,
      lastPlayed: null
    };

    await setDoc(scoreRef, {

      [game]: {

        bestScore: Math.max(previous.bestScore, score),

        totalGames: previous.totalGames + 1,

        lastPlayed: new Date().toISOString()

      }

    }, { merge: true });

  }
async recordGamePlayed(
  uid: string,
  game: string
) {

  const scoreRef = doc(db, 'scores', uid);

  const snap = await getDoc(scoreRef);

  let data: any = {};

  if (snap.exists()) {
    data = snap.data();
  }

  const previous = data[game] || {
    bestScore: 0,
    totalGames: 0,
    lastPlayed: null
  };

  await setDoc(
    scoreRef,
    {
      [game]: {
        bestScore: previous.bestScore,
        totalGames: previous.totalGames + 1,
        lastPlayed: new Date().toISOString()
      }
    },
    { merge: true }
  );
}

}