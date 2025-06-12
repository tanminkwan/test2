-- Docker PostgreSQL 초기화 스크립트
-- 이 파일은 PostgreSQL 컨테이너 시작 시 자동으로 실행됩니다.

-- 1. vehicle_game 데이터베이스 생성
CREATE DATABASE vehicle_game;

-- 2. app_user 사용자 생성
CREATE USER app_user WITH PASSWORD 'app123!@#';

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

-- 8. 초기화 완료 로그
SELECT 'Docker PostgreSQL 초기화 완료!' as status;
SELECT 'Database: vehicle_game' as info;
SELECT 'User: app_user' as info; 