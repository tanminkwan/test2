@echo off
setlocal

REM ===============================
REM Event Processor Service - DB 자동 설정 스크립트 (재사용/반복 가능)
REM ===============================

REM 환경 변수 설정
set PG_ADMIN_USER=postgres
set PG_ADMIN_PW=1q2w3e4r!!
set APP_USER=app_user
set APP_PW=app123!@#
set DB_NAME=game_statistics
set PG_HOST=localhost
set PG_PORT=5432
set SCRIPT_DIR=%~dp0
set LOG_FILE=%SCRIPT_DIR%setup-database.log

REM PostgreSQL bin 경로 (환경에 맞게 수정 필요)
set PG_BIN="C:\Program Files\PostgreSQL\17\bin"
set PATH=%PG_BIN%;%PATH%

REM ===============================
REM PowerShell에서 psql 접속 시 비밀번호에 특수문자(#, !, @ 등)가 포함되면 반드시 아래 방식으로 환경변수 설정할 것
REM   $env:PGPASSWORD='비밀번호'; psql ...
REM 쌍따옴표(" ")로 감싸면 실제 비밀번호에 쌍따옴표가 포함되어 인증 오류 발생함
REM ===============================

REM 1. DB/USER/권한 생성 (idempotent)
echo.
echo [1/3] DB/USER/권한 생성...
set PGPASSWORD=%PG_ADMIN_PW%
psql -U %PG_ADMIN_USER% -h %PG_HOST% -p %PG_PORT% -d postgres -v ON_ERROR_STOP=1 -f "%SCRIPT_DIR%create-user.sql" > %LOG_FILE% 2>&1
if %errorlevel% neq 0 (
    echo ✗ DB/USER/권한 생성 실패! 자세한 내용은 %LOG_FILE% 참조
    goto :end
)

REM 2. 테이블/확장/인덱스 생성 (idempotent, superuser)
echo.
echo [2/3] 테이블/확장/인덱스 생성...
set PGPASSWORD=%PG_ADMIN_PW%
psql -U %PG_ADMIN_USER% -h %PG_HOST% -p %PG_PORT% -d %DB_NAME% -v ON_ERROR_STOP=1 -f "%SCRIPT_DIR%create-tables.sql" >> %LOG_FILE% 2>&1
if %errorlevel% neq 0 (
    echo ✗ 테이블/확장/인덱스 생성 실패! 자세한 내용은 %LOG_FILE% 참조
    goto :end
)

REM 3. 최종 확인 (테이블 목록)
echo.
echo [3/3] 테이블 생성 결과 확인...
set PGPASSWORD=%APP_PW%
psql -U %APP_USER% -h %PG_HOST% -p %PG_PORT% -d %DB_NAME% -c "\dt" >> %LOG_FILE% 2>&1
if %errorlevel% neq 0 (
    echo ✗ 테이블 확인 실패! 자세한 내용은 %LOG_FILE% 참조
    goto :end
)

REM 성공 메시지
echo.
echo ========================================
echo ✓ Event Processor Service DB/테이블/권한 자동 설정 완료!
echo ========================================
echo 자세한 내역은 %LOG_FILE% 참조

goto :eof

:end
echo.
echo ✗ 오류 발생! 자세한 내용은 %LOG_FILE% 참조
endlocal 