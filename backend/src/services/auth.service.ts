import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Prisma, Role } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { publicUserSelect, toPublicUser, type AuthUser, type PublicUser } from "../utils/mappers.js";
import type { LoginInput, RegisterInput, UpdateMeInput } from "../validators/auth.validators.js";

export const BCRYPT_ROUNDS = 10;

/** JWT payload (MASTER_PLAN 10.1): `{ sub: userId, role, departmentId }`. */
export interface JwtClaims {
  sub: number;
  role: Role;
  departmentId: number | null;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

// Compared against when the email is unknown, so login timing does not reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("campusfix-dummy-password", BCRYPT_ROUNDS);

export function signToken(user: Pick<AuthUser, "id" | "role" | "departmentId">): string {
  const claims: JwtClaims = { sub: user.id, role: user.role, departmentId: user.departmentId };
  return jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/** Throws ApiError 401 for any invalid / expired / malformed token. */
export function verifyToken(token: string): JwtClaims {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized(err instanceof jwt.TokenExpiredError ? "Session expired, please log in again" : "Invalid token");
  }
  if (typeof decoded !== "object" || decoded === null) throw ApiError.unauthorized("Invalid token");
  const sub = Number(decoded.sub);
  if (!Number.isInteger(sub) || sub <= 0) throw ApiError.unauthorized("Invalid token");
  return {
    sub,
    role: decoded.role as Role,
    departmentId: typeof decoded.departmentId === "number" ? decoded.departmentId : null,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Public self-registration always creates a STUDENT (MASTER_PLAN 4). */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: "STUDENT",
    },
    select: publicUserSelect,
  });

  return { token: signToken(user), user: toPublicUser(user) };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const row = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  });

  const passwordOk = await bcrypt.compare(input.password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !passwordOk) throw ApiError.unauthorized("Invalid email or password");
  if (!row.isActive) throw ApiError.forbidden("Your account has been deactivated. Please contact the administrator.");

  const { passwordHash: _passwordHash, ...user } = row;
  return { token: signToken(user), user: toPublicUser(user) };
}

/** Loads the current user for `authenticate`; null when the token's user no longer exists. */
export async function findAuthUser(id: number): Promise<AuthUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}

export async function updateMe(user: AuthUser, input: UpdateMeInput): Promise<PublicUser> {
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;

  if (input.newPassword !== undefined) {
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    const ok = await bcrypt.compare(input.currentPassword ?? "", row.passwordHash);
    if (!ok) {
      throw ApiError.validation("Current password is incorrect", [
        { path: "currentPassword", message: "Current password is incorrect" },
      ]);
    }
    data.passwordHash = await hashPassword(input.newPassword);
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data, select: publicUserSelect });
  return toPublicUser(updated);
}
