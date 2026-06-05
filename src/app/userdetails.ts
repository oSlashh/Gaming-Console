import { Injectable, signal } from '@angular/core';

export interface User {
  name: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class Userdetails {
  private registeredUsers = signal<User[]>([]);
  currentUser = signal<User | null>(null);

  private isEmailTaken(email: string) {
    return this.registeredUsers().some(u => u.email.toLowerCase() === email.toLowerCase());
  }

  private isNameTaken(name: string) {
    return this.registeredUsers().some(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
  }

  registerUser(user: User) {
    if (this.isEmailTaken(user.email)) {
      return false;
    }
    if (this.isNameTaken(user.name)) {
      return false;
    }

    this.registeredUsers.update(list => [...list, user]);
    return true;
  }

  findUserByEmail(email: string) {
    return this.registeredUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  authenticate(email: string, password: string) {
    const user = this.findUserByEmail(email);
    if (!user) return false;
    if (user.password !== password) return false;
    this.currentUser.set(user);
    return true;
  }

  getRegisteredUsers() {
    return this.registeredUsers();
  }

  setUserDetails(user: User | null) {
    this.currentUser.set(user);
  }

  getUserDetails() {
    return this.currentUser();
  }
}
