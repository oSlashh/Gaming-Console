import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Userdetails } from '../userdetails';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router, private userdetails: Userdetails) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      alert('Please fill in all fields correctly!');
      return;
    }
    const { email, password } = this.loginForm.value;
    const ok = this.userdetails.authenticate(email, password);
    if (!ok) {
      alert('Invalid credentials or user not registered.');
      return;
    }

    alert('Login successful — redirecting.');
    this.router.navigate(['/']);
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
