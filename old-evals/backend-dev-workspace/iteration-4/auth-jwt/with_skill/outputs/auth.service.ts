import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';

interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ access_token: string; user: { id: number; email: string; name: string } }> {
    const user = await this.usersService.create(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);

    return { access_token, user };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ access_token: string; user: { id: number; email: string; name: string } }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { access_token, user: userWithoutPassword };
  }

  async getProfile(userId: number) {
    return this.usersService.findById(userId);
  }
}
