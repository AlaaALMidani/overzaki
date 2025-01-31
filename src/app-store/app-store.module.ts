import { Module } from '@nestjs/common';
import { AppStoreService } from './app-store.service';
import { AppStoreController } from './app-store.controller';

@Module({
  providers: [AppStoreService],
  controllers: [AppStoreController],
  exports: [AppStoreService], 
})
export class AppStoreModule {}
