import { inject, Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  Auth,
  User
} from 'firebase/auth';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private auth: Auth;
  app: FirebaseApp;

  private _currentUser = signal<User | null>(null);
  private _loading = signal<boolean>(true);

  currentUser = this._currentUser.asReadonly();
  loading = this._loading.asReadonly();
  isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);

    onAuthStateChanged(this.auth, (user) => {
      this._currentUser.set(user);
      this._loading.set(false);
    });
  }

  async signUp(email: string, password: string): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    this._currentUser.set(userCredential.user);
  }

  async signIn(email: string, password: string): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    this._currentUser.set(userCredential.user);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  getUserId(): string | null {
    return this._currentUser()?.uid ?? null;
  }
}