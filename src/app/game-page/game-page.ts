import { Component } from '@angular/core';
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
  pageDescription = 'Choose a prototype game to explore the next step of your console experience.';

  readonly games: GameOption[] = [
    {
      id: 1,
      name: 'Flappy Escape',
      description: 'A stylish flappy-bird inspired arcade game',
    },
    {
      id: 2,
      name: 'Image Puzzle',
      description: 'Solve a polished tile puzzle using curated and uploaded images.',
    },
    {
      id: 3,
      name: 'Game 3',
      description: 'Another prototype game placeholder for future expansion.',
    },
  ];

  constructor(private readonly router: Router) {}

  onSelectGame(game: GameOption): void {
    if (game.id === 2) {
      this.router.navigate(['/image-puzzle-info']);
      return;
    }
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
