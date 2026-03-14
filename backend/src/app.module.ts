import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AiModule } from './modules/ai/ai.module';
import { ParserModule } from './modules/parser/parser.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { ChunkingModule } from './modules/chunking/chunking.module';
import { VectorModule } from './modules/vector/vector.module';
import { SearchModule } from './modules/search/search.module';
import { QueryModule } from './modules/query/query.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
    }),
    DatabaseModule,
    AuthModule,
    DocumentsModule,
    AiModule,
    ParserModule,
    IngestionModule,
    ChunkingModule,
    VectorModule,
    SearchModule,
    QueryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
