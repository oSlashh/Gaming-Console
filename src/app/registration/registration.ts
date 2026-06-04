import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrl: './registration.css'
})
export class Registration {

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  submit() {
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    else if (!this.name || !this.email || !this.password) {
      alert('Please fill in all fields!');
      return;
    }
    else {
      alert('Registration Successful!');
    }

    console.log({
      name: this.name,
      email: this.email,
      password: this.password
    });
  }
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
}
}