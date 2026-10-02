export type User = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

export type Session = {
  userId: string;
};
