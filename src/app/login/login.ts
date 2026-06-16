import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../services/user.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router, private userService: UserService) {
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

  this.userService.getUsers().subscribe({
    next: (users: any[]) => {

      const user = users.find(
        u => u.email === email &&
             u.password === password
      );

      if (!user) {
        alert('Invalid credentials or user not registered.');
        return;
      }

      alert('Login successful!');
      this.router.navigate(['/game-page']);
    },

    error: (err: any) => {
      console.error(err);
      alert('Unable to connect to server');
    }
  });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
