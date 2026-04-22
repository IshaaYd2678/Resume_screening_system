-- PostgreSQL initialization script for IRSS
-- Creates pgvector extension and initial schema

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges to application user
GRANT CONNECT ON DATABASE irss_db TO irss_admin;
GRANT USAGE ON SCHEMA public TO irss_admin;
GRANT CREATE ON SCHEMA public TO irss_admin;

-- Set search path
ALTER ROLE irss_admin SET search_path = public;
