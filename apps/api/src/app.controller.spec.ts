import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('public', () => {
    it('should return public message', () => {
      expect(appController.getPublic()).toEqual({ message: 'Esto lo puede ver todo el mundo 🌍' });
    });
  });
});
