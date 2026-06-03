import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email= '';
  password= '';

  login(){
    console.log(this.email + " Pressed me");
    console.log(this.email);
    console.log(this.password);
  }
}
