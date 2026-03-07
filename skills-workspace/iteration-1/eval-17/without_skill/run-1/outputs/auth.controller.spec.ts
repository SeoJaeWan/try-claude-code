import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from './entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'uuid-1234',
    email: 'test@example.com',
    name: '테스트유저',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: '테스트유저',
      };

      authService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const result = await controller.register(registerDto);

      expect(result.statusCode).toBe(HttpStatus.CREATED);
      expect(result.data.user).toEqual(mockUser);
      expect(result.data.tokens).toEqual(mockTokens);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return tokens', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      authService.login.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const result = await controller.login(loginDto);

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data.user).toEqual(mockUser);
      expect(result.data.tokens).toEqual(mockTokens);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens', async () => {
      authService.refreshTokens.mockResolvedValue(mockTokens);

      const result = await controller.refresh('old-refresh-token');

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data).toEqual(mockTokens);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout the user', async () => {
      authService.logout.mockResolvedValue(undefined);

      const req = { user: { sub: 'uuid-1234' } };
      const result = await controller.logout(req);

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(authService.logout).toHaveBeenCalledWith('uuid-1234');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return the user profile', async () => {
      authService.getProfile.mockResolvedValue(mockUser);

      const req = { user: { sub: 'uuid-1234' } };
      const result = await controller.getProfile(req);

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data).toEqual(mockUser);
    });
  });

  describe('PATCH /auth/change-password', () => {
    it('should change the password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      authService.changePassword.mockResolvedValue(undefined);

      const req = { user: { sub: 'uuid-1234' } };
      const result = await controller.changePassword(req, changePasswordDto);

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(authService.changePassword).toHaveBeenCalledWith(
        'uuid-1234',
        changePasswordDto,
      );
    });
  });
});
