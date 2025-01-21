-- Active: 1732308352274@@127.0.0.1@5432@supermemorydhravya
ALTER TABLE "users" ADD COLUMN "last_api_key_generated_at" timestamp DEFAULT now();