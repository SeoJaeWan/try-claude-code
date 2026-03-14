import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user and return accessToken', async () => {
      const result = await service.register(registerDto);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.name).toBe(registerDto.name);
      expect(result.user).not.toHaveProperty('password');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: expect.any(String),
        email: registerDto.email,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      await service.register(registerDto);
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    beforeEach(async () => {
      await service.register(registerDto);
    });

    it('should return accessToken for valid credentials', async () => {
      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(loginDto.email);
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      await expect(
        service.login({ email: 'wrong@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findUserById', () => {
    it('should return user without password for valid id', async () => {
      const registerResult = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const user = service.findUserById(registerResult.user.id);
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user).not.toHaveProperty('password');
    });

    it('should return undefined for non-existent id', () => {
      const user = service.findUserById('non-existent-id');
      expect(user).toBeUndefined();
    });
  });
});
