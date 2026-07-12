import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';
import type { UserDoc } from '../models/user.js';
import { ConflictError, UnauthorizedError } from '../errors/index.js';
import { env } from '../config/env.js';
import type { SignupInput, LoginInput } from '../validators/auth.schema.js';

const SALT_ROUNDS = 12;

function signToken(user: UserDoc): string {
  // jsonwebtoken v9 types `expiresIn` as a specific literal union (e.g. '7d', '1h')
  // rather than plain `string`, since env vars are only known at runtime we
  // assert the type here rather than over-constrain env.ts for one field.
  const options: jwt.SignOptions = env.jwtExpiresIn
    ? { expiresIn: env.jwtExpiresIn as Exclude<jwt.SignOptions['expiresIn'], undefined> }
    : {};
  return jwt.sign({ userId: user._id.toString(), email: user.email }, env.jwtSecret, options);
}

/**
 * Why Promise.all here: checking whether the email is already taken, and
 * hashing the incoming password, are two operations with no dependency on
 * each other's result. Awaiting them sequentially (check, then hash) would
 * mean paying their combined latency one after another for no reason.
 * Promise.all runs both concurrently, so total time is roughly max(a, b)
 * instead of a + b. bcrypt hashing at 12 rounds is deliberately slow
 * (that's the point, for brute-force resistance), so overlapping it with
 * the DB lookup is a real, measurable win here — not just a style choice.
 *
 * No try/catch anywhere in this file: if `User.findOne` rejects (DB down)
 * or `bcrypt.hash` rejects, that rejection just propagates up naturally.
 * The route handler is wrapped in `asyncHandler`, so it lands in
 * `next(err)` and flows straight into the global error handler.
 */
export async function signup(input: SignupInput): Promise<{ token: string; user: UserDoc }> {
  const [existingUser, passwordHash] = await Promise.all([
    User.findOne({ email: input.email }),
    bcrypt.hash(input.password, SALT_ROUNDS),
  ]);

  if (existingUser) {
    throw new ConflictError('An account with this email already exists');
  }

  const user = await User.create({
    email: input.email,
    passwordHash,
    name: input.name,
  });

  return { token: signToken(user), user };
}

export async function login(input: LoginInput): Promise<{ token: string; user: UserDoc }> {
  // passwordHash has `select: false` in the schema, so it must be opted
  // into explicitly here — a deliberate guard against accidentally
  // leaking hashes through some other query elsewhere in the app.
  const user = await User.findOne({ email: input.email }).select('+passwordHash');

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(input.password, user.passwordHash);

  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return { token: signToken(user), user };
}