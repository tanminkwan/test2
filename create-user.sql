-- PostgreSQL 새 사용자 생성 스크립트
-- 실행 방법: psql -U postgres -h localhost -f create-user.sql

-- 1. 새 사용자 생성
CREATE USER app_user WITH PASSWORD 'app123!@#';

-- 2. 데이터베이스 생성 권한 부여
ALTER USER app_user CREATEDB;

-- 3. user_service 데이터베이스에 대한 권한 부여
GRANT ALL PRIVILEGES ON DATABASE user_service TO app_user;

-- 4. 스키마 권한 부여 (user_service 데이터베이스에 연결 후)
\c user_service
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 5. 향후 생성될 테이블에 대한 기본 권한 설정
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;

-- 6. 생성된 사용자 확인
\c postgres
SELECT usename, usecreatedb, usesuper FROM pg_user WHERE usename = 'app_user';

\echo '새 사용자 app_user가 생성되었습니다!'
\echo '비밀번호: app123!@#'
\echo '테스트: psql -U app_user -h localhost -d user_service' 