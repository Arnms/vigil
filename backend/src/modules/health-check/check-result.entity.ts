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

export enum CheckStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

@Entity('check_results')
@Index(['endpointId', 'checkedAt'])
export class CheckResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  endpointId: string;

  @ManyToOne(() => Endpoint, (endpoint) => endpoint.checkResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'endpointId' })
  endpoint: Endpoint;

  @Column({
    type: 'enum',
    enum: CheckStatus,
  })
  status: CheckStatus;

  @Column({ type: 'float', nullable: true })
  responseTime: number | null;

  @Column({ type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  @Index()
  checkedAt: Date;
}
