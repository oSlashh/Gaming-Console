import { Component } from '@angular/core';

@Component({
  selector: 'app-oops-realm',
  standalone: true,
  template: `
    <div class="realm-container">
      <div class="realm-left">
        <h1 class="realm-title">Oops Realm</h1>
        <p class="realm-desc">
          Outwit your friends in a chaotic game of spells and mishaps. Trust no one, as someone in the room doesn't know the secret.
        </p>
        <div class="stats-card">
          <h3 class="stats-title">Realm Statistics</h3>
          <div class="stat-item">
            <span class="stat-label">Best Score</span>
            <span class="stat-val">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Games Played</span>
            <span class="stat-val">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Last Played</span>
            <span class="stat-val">--</span>
          </div>
        </div>
      </div>
      <div class="realm-right">
        <div class="placeholder-area">
          <div class="artwork-placeholder">💥</div>
          <span>[ Island Artwork Placeholder ]</span>
        </div>
        <div class="placeholder-area" style="aspect-ratio: 21 / 9;">
          <span>[ Large Image Placeholder Area ]</span>
        </div>
      </div>
      <div class="realm-bottom">
        <button class="play-btn" disabled>PLAY</button>
      </div>
    </div>
  `,
  styleUrl: './realms.css'
})
export class OopsRealmComponent {}
