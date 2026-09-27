import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sport-competition-secret-key-dz-2026';

export interface UserPayload {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'LEAGUE_MANAGER';
  wilayaId: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

/** Extracts Bearer token and attaches user to req if valid */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (payload) {
    req.user = payload;
  }
  next();
}

/** Requires an authenticated user */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié. Connexion requise.' });
    return;
  }
  next();
}

/** Requires SUPER ADMIN role */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié. Connexion requise.' });
    return;
  }
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Accès interdit. Rôle Super Admin requis.' });
    return;
  }
  next();
}

/** Requires either ADMIN or LEAGUE_MANAGER role */
export function requireLeagueOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié. Connexion requise.' });
    return;
  }
  if (req.user.role !== 'ADMIN' && req.user.role !== 'LEAGUE_MANAGER') {
    res.status(403).json({ error: 'Accès interdit.' });
    return;
  }
  next();
}
