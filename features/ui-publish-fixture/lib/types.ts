export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  skills?: string[];
  birthDate?: string;
  avatarFileName?: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}
