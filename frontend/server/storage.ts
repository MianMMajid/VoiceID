import { type User, type InsertUser, type ApiKey, type InsertApiKey } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "../db";
import { users, apiKeys } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // API Key methods
  getApiKey(key: string): Promise<ApiKey | undefined>;
  getApiKeysByUserId(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  incrementVerifications(keyId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getApiKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return apiKey;
  }

  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const key = `vlo_${randomUUID().replace(/-/g, '')}`;
    const [apiKey] = await db.insert(apiKeys).values({
      ...insertApiKey,
      key,
    }).returning();
    return apiKey;
  }

  async incrementVerifications(keyId: string): Promise<void> {
    await db.update(apiKeys)
      .set({ verificationsUsed: sql`${apiKeys.verificationsUsed} + 1` })
      .where(eq(apiKeys.id, keyId));
  }
}

export const storage = new DbStorage();
