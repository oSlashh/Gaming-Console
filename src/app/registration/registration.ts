import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Userdetails } from '../userdetails';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrl: './registration.css'
})
export class Registration {
  registrationForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router, private userdetails: Userdetails) {
    this.registrationForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  passwordsMatch(group: FormGroup) {
    const p = group.get('password')?.value;
    const cp = group.get('confirmPassword')?.value;
    return p === cp ? null : { passwordMismatch: true };
  }

  submit() {
    console.log(this.registrationForm.value);   
     console.log(this.registrationForm.get('name')?.value);

    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      alert('Please fix errors before submitting.');
      return;
    }

    const { name, email, password } = this.registrationForm.value;
    const registered = this.userdetails.registerUser({ name, email, password });
    if (!registered) {
      alert('A user with this name or email is already registered.');
      return;
    }

    alert('Registration Successful! Redirecting to login.');
    this.router.navigate(['/login']);
  }
  goHome() {
    this.router.navigate(['/']);
  }
}