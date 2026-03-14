import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/database/entities/user.entity';
import { Document } from '../modules/database/entities/document.entity';
import { Chunk } from '../modules/database/entities/chunk.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'rag_db',
  synchronize: false,
  logging: true,
  entities: [User, Document, Chunk],
  migrations: [__dirname + '/../migrations/*.ts'],
  subscribers: [],
});
