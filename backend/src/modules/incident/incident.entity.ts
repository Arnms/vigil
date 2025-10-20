import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Endpoint } from '../endpoint/endpoint.entity';

@Entity('incidents')
@Index(['endpointId', 'resolvedAt'])
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  endpointId: string;

  @ManyToOne(() => Endpoint, (endpoint) => endpoint.incidents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'endpointId' })
  endpoint: Endpoint;

  @CreateDateColumn()
  @Index()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  resolvedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;
}
