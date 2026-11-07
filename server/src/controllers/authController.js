import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { dataAccess } from '../services/dataAccess.js';
import { signToken } from '../middleware/auth.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const authController = {
  async register(req, res) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { name, email, password } = parsed.data;
      const existing = await dataAccess.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 8);
      const user = await dataAccess.createUser({ name, email, passwordHash });
      const token = signToken(user);

      return res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: { id: user.id, name: user.name, email: user.email, status: user.status }
      });
    } catch (err) {
      console.error('[AUTH REGISTER ERROR]', err);
      return res.status(500).json({ error: 'Internal server error during registration.' });
    }
  },

  async login(req, res) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, password } = parsed.data;
      const user = await dataAccess.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = signToken(user);
      return res.json({
        message: 'Login successful.',
        token,
        user: { id: user.id, name: user.name, email: user.email, status: user.status, reliability_score: user.reliability_score }
      });
    } catch (err) {
      console.error('[AUTH LOGIN ERROR]', err);
      return res.status(500).json({ error: 'Internal server error during login.' });
    }
  },

  // 1-Click shortcut for judges to skip signup
  async demoLogin(req, res) {
    try {
      const email = req.body.email || 'alice@demo.com';
      const user = await dataAccess.findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: `Demo user '${email}' not found. Please run seed script.` });
      }

      const token = signToken(user);
      return res.json({
        message: `Logged in as demo user (${user.name}).`,
        token,
        user: { id: user.id, name: user.name, email: user.email, status: user.status, reliability_score: user.reliability_score }
      });
    } catch (err) {
      console.error('[AUTH DEMO LOGIN ERROR]', err);
      return res.status(500).json({ error: 'Failed to authenticate demo user.' });
    }
  },

  async me(req, res) {
    try {
      const user = await dataAccess.findUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User profile not found.' });

      const activeMatch = await dataAccess.getUserActiveMatch(user.id);
      return res.json({ user, activeMatch });
    } catch (err) {
      console.error('[AUTH ME ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
  }
};
