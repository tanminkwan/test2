-- 테이블 소유권 확인 스크립트

-- 테이블 소유권 정보 조회
SELECT tablename, tableowner 
FROM pg_tables 
WHERE schemaname = 'public';

-- app_user의 권한 정보 조회
SELECT grantee, table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE grantee = 'app_user';

-- 테이블 생성 스크립트 정보 조회
SELECT n.nspname as schema_name,
       c.relname as table_name,
       a.rolname as owner_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_authid a ON a.oid = c.relowner
WHERE c.relkind = 'r'  -- 'r'은 일반 테이블을 의미
  AND n.nspname = 'public'
ORDER BY schema_name, table_name; 