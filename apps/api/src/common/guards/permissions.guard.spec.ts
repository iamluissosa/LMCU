import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const createContext = (user: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  it('allows when no permissions metadata is defined', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    const guard = new PermissionsGuard(reflector);
    const context = createContext({ role: 'USER', permissions: [] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows admin regardless of permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['any.permission']),
    } as unknown as Reflector;

    const guard = new PermissionsGuard(reflector);
    const context = createContext({ role: 'ADMIN', permissions: [] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows when user has all required permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['a', 'b']),
    } as unknown as Reflector;

    const guard = new PermissionsGuard(reflector);
    const context = createContext({ role: 'USER', permissions: ['a', 'b', 'c'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies when user is missing a required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['a', 'b']),
    } as unknown as Reflector;

    const guard = new PermissionsGuard(reflector);
    const context = createContext({ role: 'USER', permissions: ['a'] });

    expect(guard.canActivate(context)).toBe(false);
  });
});
