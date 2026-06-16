import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html'
})
export class App implements OnInit {

  constructor(private userService: UserService) {}

  ngOnInit() {

    console.log('Calling API...');

    this.userService.getUsers().subscribe({
      next: (data) => {
        console.log('SUCCESS');
        console.log(data);
      },
      error: (err) => {
        console.log('ERROR');
        console.log(err);
      }
    });

  }
}