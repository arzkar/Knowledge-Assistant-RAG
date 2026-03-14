import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Document } from './document.entity';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Document, (document) => document.user)
  documents: Document[];
}

@Entity('session')
export class Session {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column()
  token: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('account')
export class Account {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column()
  accountId: string;

  @Column()
  providerId: string;

  @Column({ nullable: true })
  accessToken?: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  accessTokenExpiresAt?: Date;

  @Column({ nullable: true })
  refreshTokenExpiresAt?: Date;

  @Column({ nullable: true })
  scope?: string;

  @Column({ nullable: true })
  password?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('verification')
export class Verification {
  @PrimaryColumn()
  id: string;

  @Column()
  identifier: string;

  @Column()
  value: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
