import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';

interface GameOption {
  id: number;
  name: string;
  description: string;
  
}

@Component({
  selector: 'app-game-page',
  standalone: true,
  imports: [],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage {
    pageTitle = 'Gaming Console Dashboard';
    pageDescription =
    'Choose a prototype game to explore the next step of your console experience.';

  readonly games: GameOption[] = [
    {
      id: 1,
      name: 'Flappy Escape',
      description: 'A stylish flappy-bird inspired arcade game',
    },
    {
      id: 2,
      name: 'Game 2',
      description: 'Placeholder description for Game 2',
    },
    {
      id: 3,
      name: 'Game 3',
      description: 'Placeholder description for Game 3',
    },
  ];

  readonly selectedGame = signal<GameOption | null>(null);
  constructor(private router: Router) {}

  onSelectGame(game: GameOption): void {
    this.selectedGame.set(game);
    console.log('Selected game:', game.name);
  }

  openGame(game: GameOption): void {
    this.onSelectGame(game);
    if (/flappy/i.test(game.name)) {
      this.router.navigate(['/flappy-bird']);
    } else if (/dungeon/i.test(game.name)) {
      this.router.navigate(['/dungeon-escape']);
    }
  }
}
