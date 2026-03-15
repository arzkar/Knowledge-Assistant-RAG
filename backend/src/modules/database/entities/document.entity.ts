import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Chunk } from './chunk.entity';

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  FETCHED = 'FETCHED',
  PARSED = 'PARSED',
  METADATA_DONE = 'METADATA_DONE',
  CHUNKED = 'CHUNKED',
  CONTEXTUALIZED = 'CONTEXTUALIZED',
  EMBEDDED = 'EMBEDDED',
  BM25_INDEXED = 'BM25_INDEXED',
  VECTOR_INDEXED = 'VECTOR_INDEXED',
  READY = 'READY',
  FAILED = 'FAILED',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  filePath: string;

  @Index()
  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADED,
  })
  status: DocumentStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Chunk, (chunk) => chunk.document)
  chunks: Chunk[];
}
