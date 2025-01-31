import { database, eq } from '@supermemory/db';
import { userRoles } from '@supermemory/db/schema';

export const checkUserRole = async (userId: string, role: string): Promise<boolean> => {
  const result = await database()
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId), eq(userRoles.role, role))
    .limit(1);

  return result.length > 0;
};

export const assignUserRole = async (userId: string, role: string): Promise<boolean> => {
  try {
    await database().insert(userRoles).values({
      userId,
      role,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Failed to assign role:', error);
    return false;
  }
};
