import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Home2 } from './home2/home2';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Home2],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Gaming-Console');
}
