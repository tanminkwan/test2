# 이벤트 프로세서 서비스 실행 스크립트 (Windows PowerShell)
# 사용법: .\scripts\start-service.ps1 [dev|prod]

param (
    [string]$mode = "dev"  # 기본값은 개발 모드
)

# 스크립트 경로 설정
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$servicePath = Split-Path -Parent $scriptPath

# 서비스 디렉토리로 이동
Set-Location -Path $servicePath

# 필요한 디렉토리 생성
$logDir = Join-Path -Path $servicePath -ChildPath "logs"
if (-not (Test-Path -Path $logDir)) {
    Write-Host "로그 디렉토리 생성: $logDir"
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# 환경 파일 확인
$envFile = Join-Path -Path $servicePath -ChildPath ".env"
if (-not (Test-Path -Path $envFile)) {
    Write-Host "경고: .env 파일이 없습니다. 기본 설정을 사용합니다."
}

# 종속성 설치 확인
$nodeModulesPath = Join-Path -Path $servicePath -ChildPath "node_modules"
if (-not (Test-Path -Path $nodeModulesPath)) {
    Write-Host "종속성 설치 중..."
    npm install
}

# 서비스 실행
if ($mode -eq "dev") {
    Write-Host "개발 모드로 서비스를 시작합니다..."
    npm run dev
}
elseif ($mode -eq "prod") {
    Write-Host "프로덕션 모드로 서비스를 시작합니다..."
    npm start
}
else {
    Write-Host "오류: 잘못된 모드입니다. 'dev' 또는 'prod'를 사용하세요."
    exit 1
} 