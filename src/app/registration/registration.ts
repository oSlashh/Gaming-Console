import { ChangeDetectorRef } from '@angular/core';
import {
  Component,
  ElementRef,
  HostListener,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../services/auth.services';
import { FirestoreService } from '../services/firestore.service';
import { auth } from '../firebase.config';
import { updateProfile } from 'firebase/auth';
@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './registration.html',
  styleUrls: ['./registration.css']
})
export class Registration {

  registerForm: FormGroup;

  @ViewChild('cursorGlow')
  cursorGlow!: ElementRef;
  isLoading: boolean=false;
  showSuccess: boolean=false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private firestoreService: FirestoreService,
  ) {

    this.registerForm = this.fb.group(
      {
        name: [
          '',
          Validators.required
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email
          ]
        ],

        password: [
          '',
          [
            Validators.required,
            Validators.minLength(6)
          ]
        ],

        confirmPassword: [
          '',
          Validators.required
        ]
      },
      {
        validators: this.passwordsMatch
      }
    );
  }

  @HostListener('document:mousemove', ['$event'])
  moveGlow(event: MouseEvent) {

    if (!this.cursorGlow) {
      return;
    }

    const glow = this.cursorGlow.nativeElement;

    glow.style.left = event.clientX + 'px';
    glow.style.top = event.clientY + 'px';
  }

  passwordsMatch(group: FormGroup) {

    const password =
      group.get('password')?.value;

    const confirmPassword =
      group.get('confirmPassword')?.value;

    return password === confirmPassword
      ? null
      : { passwordMismatch: true };
  }

  async register() {

  if (this.registerForm.invalid) {
    this.registerForm.markAllAsTouched();
    return;
  }

  this.isLoading = true;

  const {
    name,
    email,
    password
  } = this.registerForm.value;

 try {

  await this.authService.register(
    email,
    password
  );

  const user = auth.currentUser;

if (user) {

  // Save the full name in Firebase Authentication
  await updateProfile(user, {
    displayName: name.toUpperCase()
  });

  // Save the user in Firestore
  await this.firestoreService.saveUser(
    user.uid,
    name,
    email
  );

    localStorage.setItem(
      'loggedInUser',
      JSON.stringify({
        uid: user.uid,
        name,
        email
      })
    );
  }

 this.showSuccess = true;

this.cdr.detectChanges();

await this.authService.logout();

this.isLoading = false;

setTimeout(() => {
  this.router.navigate(['/login']);
}, 1500);
} catch (error: any) {

  console.error(error);

  this.isLoading = false;

  if (error.code === 'auth/email-already-in-use') {
    alert('This email is already registered.');
  } else {
    alert(error.message);
  }
}
  }
  goBack() {
    this.router.navigate(['/']);
  }

  get f() {
    return this.registerForm.controls;
  }
}