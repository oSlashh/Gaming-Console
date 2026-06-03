import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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

    alert('Registration Successful!');

    console.log({
      name: this.name,
      email: this.email,
      password: this.password
    });
  }
}