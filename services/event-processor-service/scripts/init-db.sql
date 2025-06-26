-- Docker PostgreSQL 초기화 스크립트
-- 이 파일은 PostgreSQL 컨테이너 시작 시 자동으로 실행됩니다.

-- 1. game_statistics 데이터베이스 생성 (이미 있으면 무시)
SELECT 'CREATE DATABASE game_statistics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'game_statistics')\gexec

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

-- 4. game_statistics 데이터베이스에 대한 권한 부여
GRANT ALL PRIVILEGES ON DATABASE game_statistics TO app_user;

-- 5. game_statistics 데이터베이스에 연결하여 스키마 권한 설정
\c game_statistics

-- 6. TimescaleDB 확장 추가
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 7. 스키마 권한 부여
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 8. 향후 생성될 테이블에 대한 기본 권한 설정
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;

-- 9. 초기화 완료 로그
SELECT 'Docker PostgreSQL 초기화 완료!' as status;
SELECT 'Database: game_statistics' as info;
SELECT 'User: app_user' as info; 