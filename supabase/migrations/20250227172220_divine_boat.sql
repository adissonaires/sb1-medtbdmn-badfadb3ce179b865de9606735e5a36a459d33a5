/*
  # Rollback initial schema

  This migration rolls back all changes from the initial schema setup:

  1. Drop Tables (in correct order)
    - appointments (depends on users and services)
    - services
    - users

  2. Drop Custom Types
    - appointment_status
    - user_role
*/

-- First drop tables with foreign key dependencies
DROP TABLE IF EXISTS appointments;

-- Then drop independent tables
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

-- Finally drop custom types
DROP TYPE IF EXISTS appointment_status;
DROP TYPE IF EXISTS user_role;