import { randomBytes } from 'crypto';
import { promisify } from 'util';
import { database, eq } from '@supermemory/db';
import { mfaCodes } from '@supermemory/db/schema';

const randomBytesAsync = promisify(randomBytes);

export const generateMfaCode = async (userId: string): Promise<string> => {
  const code = (await randomBytesAsync(3)).toString('hex');
  await database().insert(mfaCodes).values({
    userId,
    code,
    createdAt: new Date(),
  });
  return code;
};

export const verifyMfaCode = async (userId: string, code: string): Promise<boolean> => {
  const result = await database()
    .select()
    .from(mfaCodes)
    .where(eq(mfaCodes.userId, userId), eq(mfaCodes.code, code))
    .limit(1);

  if (result.length === 0) {
    return false;
  }

  // Optionally, you can delete the code after verification
  await database().delete(mfaCodes).where(eq(mfaCodes.userId, userId), eq(mfaCodes.code, code));

  return true;
};
