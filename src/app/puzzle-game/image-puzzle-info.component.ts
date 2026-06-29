import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-image-puzzle-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-puzzle-info.component.html',
  styleUrl: './image-puzzle-info.component.css',
})
export class ImagePuzzleInfoComponent {
  constructor(private readonly router: Router) {}

  startGame(): void {
    this.router.navigate(['/image-puzzle']);
  }

  goBack(): void {
    this.router.navigate(['/game-hub-phaser'], {
      state: {
        returnFrom: 'image-puzzle',
        playReturnAnimation: true
      }
    });
  }
}
