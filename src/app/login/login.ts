import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';



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
    if (!this.email || !this.password) {
      alert('Please fill in all fields!');
      return;
    }
    else {
      alert('Login Successful!');
    }
    console.log(this.email + " Pressed me");
    console.log(this.email);
    console.log(this.password);

    
  }
  constructor(private router: Router) {}

    goHome() {
      this.router.navigate(['/']);
    }
}
