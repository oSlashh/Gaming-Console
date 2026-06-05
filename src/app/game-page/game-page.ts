import { Component, signal } from '@angular/core';

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
      name: 'Game 1',
      description: 'Placeholder description for Game 1',
      
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

  onSelectGame(game: GameOption): void {
    this.selectedGame.set(game);
    console.log('Selected game:', game.name);
  }
}
