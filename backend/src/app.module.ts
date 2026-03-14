import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AiModule } from './modules/ai/ai.module';
import { ParserModule } from './modules/parser/parser.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    DocumentsModule,
    AiModule,
    ParserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
