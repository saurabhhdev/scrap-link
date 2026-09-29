import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

const publicUser = (user) => ({ id: user.id, name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt });
const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.role, version: user.tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export async function register(request, response) {
  const { name, phone, password, role } = request.body;
  if (!name || !phone || !password || password.length < 8) throw new AppError('Name, phone, and a password of at least 8 characters are required.', 400);
  if (!['collector', 'recycler'].includes(role)) throw new AppError('Only collector and recycler registration is available from this portal.', 403);
  if (await User.exists({ phone })) throw new AppError('An account with this phone number already exists.', 409);
  const user = await User.create({ name, phone, role, passwordHash: await bcrypt.hash(password, 12) });
  response.status(201).json({ success: true, data: { user: publicUser(user), token: tokenFor(user) } });
}

export async function login(request, response) {
  const { phone, password } = request.body;
  const user = await User.findOne({ phone }).select('+passwordHash +tokenVersion');
  if (!user || !user.isActive || !(await bcrypt.compare(password || '', user.passwordHash))) throw new AppError('Invalid phone number or password.', 401);
  response.json({ success: true, data: { user: publicUser(user), token: tokenFor(user) } });
}

export async function me(request, response) {
  response.json({ success: true, data: { user: publicUser(request.user) } });
}

export async function logout(request, response) {
  request.user.tokenVersion += 1;
  await request.user.save();
  response.status(204).end();
}
