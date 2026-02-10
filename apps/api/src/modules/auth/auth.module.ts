import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseStrategy } from './supabase.strategy';

@Module({
  imports: [PassportModule],
  providers: [SupabaseStrategy],
  exports: [PassportModule, SupabaseStrategy],
})
export class AuthModule {}
