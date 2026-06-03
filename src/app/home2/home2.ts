import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home2',
  standalone: true,
  imports: [],
  templateUrl: './home2.html',
  styleUrl: './home2.css',
})
export class Home2 {
  constructor(private router: Router) {}
  login(){
    console.log("Login clicked");
    this.router.navigate(['/login']);
  }
  register(){
    console.log("Register clicked");
    this.router.navigate(['/register']);
  }
}
