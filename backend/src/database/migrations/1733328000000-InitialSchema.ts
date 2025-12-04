import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1733328000000 implements MigrationInterface {
  name = 'InitialSchema1733328000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "notification_channels_type_enum" AS ENUM('email', 'slack', 'webhook', 'sms')
    `);

    await queryRunner.query(`
      CREATE TYPE "endpoints_method_enum" AS ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')
    `);

    await queryRunner.query(`
      CREATE TYPE "endpoints_currentstatus_enum" AS ENUM('UP', 'DOWN', 'DEGRADED', 'UNKNOWN')
    `);

    await queryRunner.query(`
      CREATE TYPE "check_results_status_enum" AS ENUM('success', 'failure')
    `);

    // Create notification_channels table
    await queryRunner.query(`
      CREATE TABLE "notification_channels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "type" "notification_channels_type_enum" NOT NULL,
        "config" jsonb NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_channels" PRIMARY KEY ("id")
      )
    `);

    // Create notification_channels indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_channels_type" ON "notification_channels" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_channels_isActive" ON "notification_channels" ("isActive")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_notification_channels_name_type" ON "notification_channels" ("name", "type")
    `);

    // Create endpoints table
    await queryRunner.query(`
      CREATE TABLE "endpoints" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "url" character varying(2048) NOT NULL,
        "method" "endpoints_method_enum" NOT NULL DEFAULT 'GET',
        "headers" jsonb,
        "body" jsonb,
        "checkInterval" integer NOT NULL DEFAULT '60',
        "expectedStatusCode" integer NOT NULL DEFAULT '200',
        "timeoutThreshold" integer NOT NULL DEFAULT '5000',
        "isActive" boolean NOT NULL DEFAULT true,
        "currentStatus" "endpoints_currentstatus_enum" NOT NULL DEFAULT 'UNKNOWN',
        "lastResponseTime" double precision,
        "lastCheckedAt" TIMESTAMP,
        "consecutiveFailures" integer NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_endpoints" PRIMARY KEY ("id")
      )
    `);

    // Create endpoints indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_endpoints_isActive_currentStatus" ON "endpoints" ("isActive", "currentStatus")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_endpoints_currentStatus" ON "endpoints" ("currentStatus")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_endpoints_isActive" ON "endpoints" ("isActive")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_endpoints_createdAt" ON "endpoints" ("createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_endpoints_updatedAt" ON "endpoints" ("updatedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_endpoints_lastCheckedAt" ON "endpoints" ("lastCheckedAt")
    `);

    // Create check_results table
    await queryRunner.query(`
      CREATE TABLE "check_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "endpointId" uuid NOT NULL,
        "status" "check_results_status_enum" NOT NULL,
        "responseTime" double precision,
        "statusCode" integer,
        "errorMessage" text,
        "checkedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_check_results" PRIMARY KEY ("id")
      )
    `);

    // Create check_results indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_check_results_endpointId" ON "check_results" ("endpointId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_check_results_checkedAt" ON "check_results" ("checkedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_check_results_endpointId_checkedAt" ON "check_results" ("endpointId", "checkedAt")
    `);

    // Create incidents table
    await queryRunner.query(`
      CREATE TABLE "incidents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "endpointId" uuid NOT NULL,
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "resolvedAt" TIMESTAMP,
        "duration" integer,
        "failureCount" integer NOT NULL DEFAULT '0',
        "errorMessage" text,
        CONSTRAINT "PK_incidents" PRIMARY KEY ("id")
      )
    `);

    // Create incidents indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_incidents_endpointId" ON "incidents" ("endpointId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_incidents_startedAt" ON "incidents" ("startedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_incidents_resolvedAt" ON "incidents" ("resolvedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_incidents_endpointId_resolvedAt" ON "incidents" ("endpointId", "resolvedAt")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "check_results"
      ADD CONSTRAINT "FK_check_results_endpoint"
      FOREIGN KEY ("endpointId")
      REFERENCES "endpoints"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "incidents"
      ADD CONSTRAINT "FK_incidents_endpoint"
      FOREIGN KEY ("endpointId")
      REFERENCES "endpoints"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT "FK_incidents_endpoint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "check_results" DROP CONSTRAINT "FK_check_results_endpoint"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "incidents"`);
    await queryRunner.query(`DROP TABLE "check_results"`);
    await queryRunner.query(`DROP TABLE "endpoints"`);
    await queryRunner.query(`DROP TABLE "notification_channels"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "check_results_status_enum"`);
    await queryRunner.query(`DROP TYPE "endpoints_currentstatus_enum"`);
    await queryRunner.query(`DROP TYPE "endpoints_method_enum"`);
    await queryRunner.query(`DROP TYPE "notification_channels_type_enum"`);
  }
}
