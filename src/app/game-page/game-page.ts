import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

interface GameOption {
  id: number;
  name: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-game-page',
  standalone: true,
  imports: [],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage {
  private readonly router = inject(Router);

  pageTitle = 'Gaming Console Dashboard';
  pageDescription =
    'Choose a game to play from the selection  q  below! :D';

  readonly games: GameOption[] = [
    {
      id: 1,
      name: 'Flappy Escape',
      description: 'A stylish flappy-bird inspired arcade game',
      route: '/flappy-bird',
    },
    {
      id: 2,
      name: 'Image Puzzle',
      description: 'Solve a polished tile puzzle using curated and uploaded images.',
      route: '/image-puzzle-info',
    },
    {
      id: 3,
      name: 'Reaction Time',
      description: 'Test your reflexes in this fast-paced reaction time game.',
      route: '/reaction-time',
    },
  ];

  readonly selectedGame = signal<GameOption | null>(null);
  readonly sessionNotice = signal<string | null>(this._readSessionNotice());
  readonly statusText = computed(() => {
    const notice = this.sessionNotice();
    if (notice !== null) {
      return notice;
    }

    return `Active selection: ${this.selectedGame()?.name ?? 'Choose a game to begin'}`;
  });

  onSelectGame(game: GameOption): void {
    this.sessionNotice.set(null);
    this.selectedGame.set(game);
    void this.router.navigateByUrl(game.route);
  }

  openGame(game: GameOption): void {
    this.onSelectGame(game);
  }

  private _readSessionNotice(): string | null {
    if (typeof history === 'undefined') {
      return null;
    }

    return history.state?.sessionEnded ? 'Session ended. Returning to the Game Page.' : null;
  }
}
