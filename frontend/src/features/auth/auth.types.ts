
export type User = {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    passwordSalt: string;
    createdAt: string;
};

export type Session = {
    
    userId: string;
    
};