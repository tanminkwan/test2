# PowerShell 스크립트: 데이터베이스 스키마 업데이트 및 서비스 재시작

# 색상 정의
$RED = [System.ConsoleColor]::Red
$GREEN = [System.ConsoleColor]::Green
$YELLOW = [System.ConsoleColor]::Yellow
$BLUE = [System.ConsoleColor]::Blue
$RESET = [System.ConsoleColor]::White

# 현재 디렉토리
$scriptPath = $MyInvocation.MyCommand.Path
$DIR = Split-Path $scriptPath
Set-Location "$DIR/.."

Write-Host "=======================================" -ForegroundColor $BLUE
Write-Host "시스템 수정 적용 스크립트 (Windows)" -ForegroundColor $GREEN
Write-Host "=======================================" -ForegroundColor $BLUE

# 1. 데이터베이스 스키마 업데이트
Write-Host "`n1. 데이터베이스 스키마 업데이트 중..." -ForegroundColor $YELLOW

# 환경 변수 또는 기본값 설정
$DB_HOST = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$DB_PORT = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }
$DB_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "app_user" }
$DB_PASS = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "app123!@#" }
$DB_NAME = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "game_statistics" }

Write-Host "연결 정보: $DB_USER@$DB_HOST`:$DB_PORT/$DB_NAME"

# 스키마 업데이트 실행
try {
    # PGPASSWORD 환경 변수 설정
    $env:PGPASSWORD = $DB_PASS
    
    # psql 명령 실행
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "./scripts/update-schema.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "데이터베이스 스키마가 성공적으로 업데이트되었습니다." -ForegroundColor $GREEN
    } else {
        Write-Host "스키마 업데이트 중 오류가 발생했습니다." -ForegroundColor $RED
        Write-Host $result
    }
}
catch {
    Write-Host "psql 실행 중 오류가 발생했습니다: $_" -ForegroundColor $RED
}

# 2. 서비스 재시작
Write-Host "`n2. 서비스 재시작 중..." -ForegroundColor $YELLOW

# 현재 실행 중인 서비스 중지
if (Test-Path "pid.txt") {
    $PID = Get-Content "pid.txt"
    $process = Get-Process -Id $PID -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "서비스 중지 중 (PID: $PID)..."
        Stop-Process -Id $PID -Force
    } else {
        Write-Host "이전에 실행된 서비스를 찾을 수 없습니다."
    }
}

# 의존성 설치 확인
Write-Host "의존성 확인/설치 중..."
npm install

# 서비스 재시작
Write-Host "서비스 시작 중..."
$nodeProcess = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru
$nodeProcess.Id | Out-File "pid.txt"

Write-Host "서비스가 성공적으로 재시작되었습니다." -ForegroundColor $GREEN
Write-Host "=======================================" -ForegroundColor $BLUE
Write-Host "모든 수정이 완료되었습니다!" -ForegroundColor $GREEN
Write-Host "=======================================" -ForegroundColor $BLUE 