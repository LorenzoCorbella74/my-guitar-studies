import { Injectable, signal } from '@angular/core';
import type { Auth, User } from 'firebase/auth';
import { firebaseConfig } from '../sync/firebase-config';

@Injectable({ providedIn: 'root' })
export class CloudAuthService {
  private auth: Auth | null = null;

  private _currentUser = signal<User | null>(null);
  private _loading = signal(false);

  currentUser = this._currentUser.asReadonly();
  loading = this._loading.asReadonly();

  /**
   * Firebase is only loaded on demand (via dynamic import), so it never adds weight
   * to the app's main bundle unless the user opens the cloud sync feature.
   */
  private async getAuth(): Promise<Auth> {
    if (this.auth) return this.auth;
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    this.auth = getAuth(app);
    onAuthStateChanged(this.auth, (user) => this._currentUser.set(user));
    return this.auth;
  }

  async signIn(email: string, password: string): Promise<void> {
    this._loading.set(true);
    try {
      const auth = await this.getAuth();
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const credential = await signInWithEmailAndPassword(auth, email, password);
      this._currentUser.set(credential.user);
    } finally {
      this._loading.set(false);
    }
  }

  async signOut(): Promise<void> {
    const auth = await this.getAuth();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    this._currentUser.set(null);
  }

  getUserId(): string | null {
    return this._currentUser()?.uid ?? null;
  }
}
