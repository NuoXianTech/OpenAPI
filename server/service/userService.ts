import { users } from "../db/schema/users";

export const usersService = {
  async getUser() {
    return await db.select().from(users);
  },
  
  async addUser(
    username: string,
    email: string,
    password_hash: string,
  ) {
    return await db
      .insert(users)
      .values({
        username: username,
        email: email,
        password_hash: password_hash,
      })
      .returning();
  },
};
