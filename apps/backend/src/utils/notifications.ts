import { database, eq } from '@supermemory/db';
import { notifications } from '@supermemory/db/schema';

export const sendNotification = async (userId: string, message: string): Promise<void> => {
  await database().insert(notifications).values({
    userId,
    message,
    createdAt: new Date(),
  });
};

export const getNotifications = async (userId: string): Promise<{ message: string; createdAt: Date }[]> => {
  const result = await database()
    .select({
      message: notifications.message,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(notifications.createdAt, 'desc');

  return result;
};
