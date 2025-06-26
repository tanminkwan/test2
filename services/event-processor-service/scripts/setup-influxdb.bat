@echo off
echo ========================================
echo Event Processor Service - InfluxDB 초기 설정
echo ========================================

echo.
echo [1/4] 환경변수 설정...
set INFLUX_USERNAME=admin
set INFLUX_PASSWORD=1q2w3e4r!!
set INFLUX_ORG=game-org
set INFLUX_BUCKET=game-metrics
set INFLUX_URL=http://localhost:8086
set INFLUX_TOKEN=your-influx-token
set INFLUX_RETENTION=720h

echo.
echo [2/4] InfluxDB 설정 검증...
echo.

rem InfluxDB가 실행 중인지 확인
curl -s %INFLUX_URL%/health > nul
if %errorlevel% neq 0 (
    echo ✗ InfluxDB에 연결할 수 없습니다. InfluxDB가 실행 중인지 확인하세요.
    echo   (URL: %INFLUX_URL%)
    goto :error
) else (
    echo ✓ InfluxDB에 연결되었습니다.
)

echo.
echo [3/4] InfluxDB 초기 설정...
echo.

rem 이미 설정되었는지 확인 (토큰이 유효하면 설정된 것으로 간주)
curl -s -I -H "Authorization: Token %INFLUX_TOKEN%" %INFLUX_URL%/api/v2/orgs > nul

if %errorlevel% equ 0 (
    echo ✓ InfluxDB가 이미 설정되어 있습니다.
) else (
    echo 새로운 InfluxDB 인스턴스를 설정합니다...
    
    rem InfluxDB 초기 설정
    influx setup ^
        --username %INFLUX_USERNAME% ^
        --password %INFLUX_PASSWORD% ^
        --org %INFLUX_ORG% ^
        --bucket %INFLUX_BUCKET% ^
        --retention %INFLUX_RETENTION% ^
        --token %INFLUX_TOKEN% ^
        --force
    
    if %errorlevel% neq 0 (
        echo ✗ InfluxDB 설정에 실패했습니다.
        goto :error
    ) else (
        echo ✓ InfluxDB 설정을 완료했습니다.
    )
)

echo.
echo [4/4] 버킷 및 토큰 확인...
echo.

rem 토큰으로 인증
influx auth list --org %INFLUX_ORG% --token %INFLUX_TOKEN%

rem 버킷 목록 확인
influx bucket list --org %INFLUX_ORG% --token %INFLUX_TOKEN%

echo.
echo ========================================
echo ✓ InfluxDB 설정 완료!
echo ========================================
echo.
echo InfluxDB 연결 정보:
echo - URL: %INFLUX_URL%
echo - 조직: %INFLUX_ORG%
echo - 버킷: %INFLUX_BUCKET%
echo - 사용자: %INFLUX_USERNAME%
echo - 토큰: %INFLUX_TOKEN%
echo.
echo .env 파일에 이 정보를 추가하세요:
echo INFLUX_URL=%INFLUX_URL%
echo INFLUX_TOKEN=%INFLUX_TOKEN%
echo INFLUX_ORG=%INFLUX_ORG%
echo INFLUX_BUCKET=%INFLUX_BUCKET%
echo.
goto :end

:error
echo.
echo InfluxDB 설정에 문제가 발생했습니다.
echo.

:end
pause 