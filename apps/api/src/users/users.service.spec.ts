import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TimekeepingService } from '../timekeeping/timekeeping.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SupabaseService, useValue: {} },
        { provide: MailService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: AuditService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: TimekeepingService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
