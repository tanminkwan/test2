@echo off
echo ========================================
echo PostgreSQL PATH 영구 설정
echo ========================================

echo.
echo 관리자 권한 확인 중...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ 관리자 권한이 필요합니다.
    echo 이 파일을 마우스 우클릭 후 "관리자 권한으로 실행"을 선택하세요.
    pause
    exit /b 1
)

echo ✓ 관리자 권한으로 실행 중입니다.

echo.
echo PostgreSQL 설치 경로 확인 중...
set "POSTGRES_PATH=C:\Program Files\PostgreSQL\17\bin"

if exist "%POSTGRES_PATH%\psql.exe" (
    echo ✓ PostgreSQL이 %POSTGRES_PATH%에서 발견되었습니다.
) else (
    echo ✗ PostgreSQL이 %POSTGRES_PATH%에서 발견되지 않았습니다.
    echo 설치 경로를 확인하고 배치 파일의 경로를 수정하세요.
    pause
    exit /b 1
)

echo.
echo 현재 시스템 PATH에 PostgreSQL 경로가 있는지 확인 중...
echo %PATH% | findstr /i "PostgreSQL" >nul
if %errorlevel% == 0 (
    echo ✓ PostgreSQL 경로가 이미 PATH에 있습니다.
    echo 추가 작업이 필요하지 않습니다.
) else (
    echo PostgreSQL 경로를 시스템 PATH에 추가 중...
    setx PATH "%PATH%;%POSTGRES_PATH%" /M
    if %errorlevel% == 0 (
        echo ✓ PostgreSQL 경로가 시스템 PATH에 성공적으로 추가되었습니다.
        echo.
        echo 주의: 새로운 명령 프롬프트나 PowerShell 창에서 변경사항이 적용됩니다.
        echo 현재 창에서는 다음 명령으로 PATH를 새로고침하세요:
        echo refreshenv
    ) else (
        echo ✗ PATH 설정에 실패했습니다.
    )
)

echo.
echo ========================================
echo PATH 설정 완료
echo ========================================
echo.
echo 설정된 PostgreSQL 경로: %POSTGRES_PATH%
echo.
echo 테스트하려면 새 명령창에서 다음을 실행하세요:
echo psql --version
echo.
pause 