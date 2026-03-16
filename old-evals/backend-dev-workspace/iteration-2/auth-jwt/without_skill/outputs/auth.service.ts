import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class AuthService {
  private readonly users: StoredUser[] = [];
  private idCounter = 0;

  constructor(private readonly jwtService: JwtService) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ accessToken: string; user: { id: string; name: string; email: string } }> {
    const existing = this.users.find((u) => u.email === dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    this.idCounter++;
    const user: StoredUser = {
      id: String(this.idCounter),
      name: dto.name,
      email: dto.email,
      passwordHash,
    };
    this.users.push(user);

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; user: { id: string; name: string; email: string } }> {
    const user = this.users.find((u) => u.email === dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async validateUserById(
    id: string,
  ): Promise<{ id: string; name: string; email: string } | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return null;
    }
    return { id: user.id, name: user.name, email: user.email };
  }
}
