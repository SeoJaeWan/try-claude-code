import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly users: User[] = [];
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly jwtService: JwtService) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ accessToken: string; user: Omit<User, 'password'> }> {
    const existingUser = this.users.find(
      (user) => user.email === registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.SALT_ROUNDS,
    );

    const newUser: User = {
      id: randomUUID(),
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      createdAt: new Date(),
    };

    this.users.push(newUser);

    const payload: JwtPayload = { sub: newUser.id, email: newUser.email };
    const accessToken = this.jwtService.sign(payload);

    const { password: _, ...userWithoutPassword } = newUser;
    return { accessToken, user: userWithoutPassword };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: Omit<User, 'password'> }> {
    const user = this.users.find((u) => u.email === loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const { password: _, ...userWithoutPassword } = user;
    return { accessToken, user: userWithoutPassword };
  }

  findUserById(id: string): Omit<User, 'password'> | undefined {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return undefined;
    }
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
