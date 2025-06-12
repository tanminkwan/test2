-- Windows 개발 환경용 데이터베이스 설정 스크립트
-- 실행 방법: psql -U postgres -h localhost -f setup-databases.sql

-- Kong용 사용자 및 데이터베이스 생성
DO $$
BEGIN
    -- Kong 사용자가 존재하지 않으면 생성
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kong') THEN
        CREATE USER kong WITH PASSWORD 'kongpass';
        RAISE NOTICE 'Kong 사용자가 생성되었습니다.';
    ELSE
        RAISE NOTICE 'Kong 사용자가 이미 존재합니다.';
    END IF;
END
$$;

-- Kong 데이터베이스 생성 (존재하지 않는 경우)
SELECT 'CREATE DATABASE kong OWNER kong'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kong')\gexec

-- Kong 사용자에게 권한 부여
GRANT ALL PRIVILEGES ON DATABASE kong TO kong;

-- User Service 데이터베이스 생성 (존재하지 않는 경우)
SELECT 'CREATE DATABASE user_service OWNER postgres'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'user_service')\gexec

-- 연결 테스트를 위한 테이블 생성 (Kong 데이터베이스)
\c kong kong

-- Kong 데이터베이스에 테스트 테이블 생성
CREATE TABLE IF NOT EXISTS test_connection (
    id SERIAL PRIMARY KEY,
    message TEXT DEFAULT 'Kong 데이터베이스 연결 성공!',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_connection (message) VALUES ('Kong 데이터베이스 초기화 완료')
ON CONFLICT DO NOTHING;

-- User Service 데이터베이스로 전환
\c user_service postgres

-- User Service 데이터베이스에 기본 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 테스트 데이터 삽입
INSERT INTO users (username, email, password_hash) VALUES 
    ('testuser1', 'test1@example.com', '$2b$10$dummy.hash.for.testing.purposes'),
    ('testuser2', 'test2@example.com', '$2b$10$dummy.hash.for.testing.purposes')
ON CONFLICT (username) DO NOTHING;

-- 연결 테스트용 뷰 생성
CREATE OR REPLACE VIEW user_count AS
SELECT 
    COUNT(*) as total_users,
    'User Service 데이터베이스 연결 성공!' as status
FROM users;

-- 권한 설정 확인
\c postgres postgres

-- 데이터베이스 목록 및 사용자 확인
\echo '=== 생성된 데이터베이스 목록 ==='
SELECT datname as "데이터베이스명", 
       pg_catalog.pg_get_userbyid(datdba) as "소유자"
FROM pg_database 
WHERE datname IN ('kong', 'user_service')
ORDER BY datname;

\echo '=== 생성된 사용자 목록 ==='
SELECT rolname as "사용자명",
       CASE 
           WHEN rolsuper THEN '슈퍼유저'
           WHEN rolcreatedb THEN 'DB생성가능'
           ELSE '일반사용자'
       END as "권한"
FROM pg_roles 
WHERE rolname IN ('postgres', 'kong')
ORDER BY rolname;

\echo '=== 설정 완료 ==='
\echo 'Kong 데이터베이스: kong/kongpass'
\echo 'User Service 데이터베이스: user_service/postgres'
\echo ''
\echo '연결 테스트:'
\echo 'psql -U kong -h localhost -d kong'
\echo 'psql -U postgres -h localhost -d user_service' 