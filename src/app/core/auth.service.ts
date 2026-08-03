import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoginResponse } from './models';

export const TOKEN_KEY = 'oneerp-platform-token';
export const REFRESH_KEY = 'oneerp-platform-refresh';
export const USER_KEY = 'oneerp-platform-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal(false);
  readonly user = signal<LoginResponse['user'] | null>(null);

  constructor(private http: HttpClient) {
    this.isAuthenticated.set(!!localStorage.getItem(TOKEN_KEY));
    this.user.set(this.readUser());
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>('/api/auth/login', { username, password }),
    );
    this.persist(res);
    return res;
  }

  async refresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>('/api/auth/refresh', { refreshToken }),
      );
      this.persist(res);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try {
      if (refreshToken) await firstValueFrom(this.http.post('/api/auth/logout', { refreshToken }));
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.isAuthenticated.set(false);
    this.user.set(null);
  }

  private persist(data: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.isAuthenticated.set(true);
    this.user.set(data.user);
  }

  private readUser(): LoginResponse['user'] | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LoginResponse['user'];
    } catch {
      return null;
    }
  }
}
