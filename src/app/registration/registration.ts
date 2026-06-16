import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrls: ['./registration.css']
})
export class Registration {
  registrationForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router, private userService: UserService) {
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
    this.userService.addUser({
      name,
      email,
      password,
      isActive: true,
    }).subscribe({
      next: () => {
        alert('Registration Successful!');
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        console.error(err);
        alert('Registration failed');
      }
    });
  }
  goHome() {
    this.router.navigate(['/']);
  }
}