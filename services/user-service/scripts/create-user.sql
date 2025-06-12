-- User Service - PostgreSQL 데이터베이스 및 사용자 생성 스크립트
-- 실행 방법: psql -U postgres -h localhost -f create-user.sql

-- 1. vehicle_game 데이터베이스 생성 (이미 있으면 무시)
SELECT 'CREATE DATABASE vehicle_game'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vehicle_game')\gexec

-- 2. app_user 사용자가 이미 있는지 확인하고 없으면 생성
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'app_user') THEN

      CREATE ROLE app_user LOGIN PASSWORD 'app123!@#';
   END IF;
END
$do$;

-- 3. 데이터베이스 생성 권한 부여
ALTER USER app_user CREATEDB;

-- 4. vehicle_game 데이터베이스에 대한 권한 부여
GRANT ALL PRIVILEGES ON DATABASE vehicle_game TO app_user;

-- 5. vehicle_game 데이터베이스에 연결하여 스키마 권한 설정
\c vehicle_game

-- 6. 스키마 권한 부여
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 7. 향후 생성될 테이블에 대한 기본 권한 설정
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;

-- 8. postgres 데이터베이스로 다시 연결
\c postgres

-- 9. 생성된 사용자 확인
SELECT usename, usecreatedb, usesuper FROM pg_user WHERE usename = 'app_user';

\echo '========================================='
\echo 'User Service 데이터베이스 설정 완료!'
\echo '사용자: app_user'
\echo '비밀번호: app123!@#'
\echo '데이터베이스: vehicle_game'
\echo '테스트: psql -U app_user -h localhost -d vehicle_game'
\echo '=========================================' 