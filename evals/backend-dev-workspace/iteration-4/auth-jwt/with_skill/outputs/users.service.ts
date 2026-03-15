import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [];
  private idSequence = 1;

  async create(
    email: string,
    password: string,
    name: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const existing = this.users.find((u) => u.email === email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user: User = {
      id: this.idSequence++,
      email,
      name,
      passwordHash,
    };

    this.users.push(user);

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((u) => u.email === email);
  }

  async findById(id: number): Promise<Omit<User, 'passwordHash'>> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { passwordHash: _, ...result } = user;
    return result;
  }
}
