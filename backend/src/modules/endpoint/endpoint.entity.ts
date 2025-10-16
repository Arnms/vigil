import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CheckResult } from '../health-check/check-result.entity';
import { Incident } from '../incident/incident.entity';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum EndpointStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN',
}

@Entity('endpoints')
export class Endpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 2048 })
  url: string;

  @Column({
    type: 'enum',
    enum: HttpMethod,
    default: HttpMethod.GET,
  })
  method: HttpMethod;

  @Column('jsonb', { nullable: true })
  headers: Record<string, string>;

  @Column('jsonb', { nullable: true })
  body: any;

  @Column({ default: 60 })
  checkInterval: number;

  @Column({ default: 200 })
  expectedStatusCode: number;

  @Column({ default: 5000 })
  timeoutThreshold: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: EndpointStatus,
    default: EndpointStatus.UNKNOWN,
  })
  currentStatus: EndpointStatus;

  @Column({ type: 'float', nullable: true })
  lastResponseTime: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckedAt: Date;

  @Column({ default: 0 })
  consecutiveFailures: number;

  @OneToMany(() => CheckResult, (checkResult) => checkResult.endpoint)
  checkResults: CheckResult[];

  @OneToMany(() => Incident, (incident) => incident.endpoint)
  incidents: Incident[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
