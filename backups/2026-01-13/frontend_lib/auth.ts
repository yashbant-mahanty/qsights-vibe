import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  programId?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  programId?: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate access token
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

// Generate refresh token
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

// Verify access token
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Get redirect URL based on role (defaults to dashboard when role is missing)
export function getRedirectUrl(role?: string): string {
  const roleRedirects: Record<string, string> = {
    'super-admin': '/dashboard',
    'admin': '/dashboard',
    'program-admin': '/program-admin',
    'program-manager': '/program-manager',
    'program-moderator': '/program-moderator',
    'participant': '/participant',
  };

  return role ? roleRedirects[role] || '/dashboard' : '/dashboard';
}

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Validate email exists in backend
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/auth/validate-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.exists) {
      return null;
    }

    return {
      id: data.userId || '',
      email: data.email,
      name: data.name || '',
      role: data.role,
      organizationId: data.organizationId,
      programId: data.programId,
    };
  } catch (error) {
    console.error('Error validating email:', error);
    return null;
  }
}

// Validate user password via backend login
export async function validateUserPassword(email: string, password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating password:', error);
    return false;
  }
}
