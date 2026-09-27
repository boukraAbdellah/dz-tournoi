import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb, users, wilayas } from '@sport-competition/core';
import { signToken, requireAuth, requireAdmin } from '../middleware/auth.ts';

export const authRouter = Router();

// ── Login ─────────────────────────────────────────────────────────────────
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const db = getDb();
    const user = await db.select().from(users).where(eq(users.email, String(email).trim().toLowerCase())).get();
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe invalide' });
    }

    const validPassword = await bcrypt.compare(String(password), user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe invalide' });
    }

    let wilayaName: string | null = null;
    let wilayaCode: number | null = null;
    if (user.wilayaId) {
      const w = await db.select().from(wilayas).where(eq(wilayas.id, user.wilayaId)).get();
      if (w) {
        wilayaName = w.nameFr;
        wilayaCode = w.code;
      }
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'LEAGUE_MANAGER',
      wilayaId: user.wilayaId,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        wilayaId: user.wilayaId,
        wilayaName,
        wilayaCode,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Current User Profile ──────────────────────────────────────────────────
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userPayload = req.user!;
    const db = getDb();
    const user = await db.select().from(users).where(eq(users.id, userPayload.id)).get();
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    let wilayaName: string | null = null;
    let wilayaCode: number | null = null;
    if (user.wilayaId) {
      const w = await db.select().from(wilayas).where(eq(wilayas.id, user.wilayaId)).get();
      if (w) {
        wilayaName = w.nameFr;
        wilayaCode = w.code;
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        wilayaId: user.wilayaId,
        wilayaName,
        wilayaCode,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── List Users (Admin only) ───────────────────────────────────────────────
authRouter.get('/users', requireAdmin, async (_req, res, next) => {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        wilayaId: users.wilayaId,
        wilayaNameFr: wilayas.nameFr,
        wilayaNameAr: wilayas.nameAr,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(wilayas, eq(users.wilayaId, wilayas.id))
      .orderBy(users.name)
      .all();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── Create User / League Manager (Admin only) ─────────────────────────────
authRouter.post('/users', requireAdmin, async (req, res, next) => {
  try {
    const { email, password, name, role, wilayaId } = req.body ?? {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).get();
    if (existing) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'LEAGUE_MANAGER';
    const assignedWilayaId = assignedRole === 'LEAGUE_MANAGER' && wilayaId ? Number(wilayaId) : null;

    const [created] = await db
      .insert(users)
      .values({
        email: cleanEmail,
        passwordHash,
        name: String(name).trim(),
        role: assignedRole,
        wilayaId: assignedWilayaId,
      })
      .returning();

    if (!created) return res.status(500).json({ error: 'Échec de la création du compte' });

    res.status(201).json({
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      wilayaId: created.wilayaId,
    });
  } catch (err) {
    next(err);
  }
});

// ── Delete User (Admin only) ──────────────────────────────────────────────
authRouter.delete('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (req.user?.id === targetId) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte administrateur' });
    }

    const db = getDb();
    const result = await db.delete(users).where(eq(users.id, targetId)).run();
    if (!result.rowsAffected) return res.status(404).json({ error: 'Utilisateur introuvable' });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
