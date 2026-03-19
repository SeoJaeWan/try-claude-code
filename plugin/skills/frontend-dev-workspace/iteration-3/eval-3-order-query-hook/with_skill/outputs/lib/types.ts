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

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}
