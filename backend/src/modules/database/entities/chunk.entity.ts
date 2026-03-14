import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('chunks')
export class Chunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  documentId: string;

  @ManyToOne(() => Document, (document) => document.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text' })
  contextText: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
