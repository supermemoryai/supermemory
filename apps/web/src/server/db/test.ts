import { db } from ".";
import { space, user } from "./schema";

const user = await db.select(user).all();

await db.insert(space).values([{}]);
