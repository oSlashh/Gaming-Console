import { Component } from '@angular/core';

@Component({
  selector: 'app-home2',
  standalone: true,
  imports: [],
  templateUrl: './home2.html',
  styleUrl: './home2.css',
})
export class Home2 {
  login(){
    console.log("Login clicked");
  }
  register(){
    console.log("Register clicked");
  }
}
