# 이벤트 프로세서 서비스 데이터베이스 설정 스크립트 (Windows PowerShell)
# 사용법: .\scripts\setup-database.ps1

# 스크립트 경로 설정
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$servicePath = Split-Path -Parent $scriptPath

# 환경 파일에서 설정 로드
$envFile = Join-Path -Path $servicePath -ChildPath ".env"
$envSettings = @{}

if (Test-Path -Path $envFile) {
    Get-Content -Path $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envSettings[$key] = $value
        }
    }
}

# PostgreSQL 설정
$pgHost = if ($envSettings.ContainsKey("POSTGRES_HOST")) { $envSettings["POSTGRES_HOST"] } else { "localhost" }
$pgPort = if ($envSettings.ContainsKey("POSTGRES_PORT")) { $envSettings["POSTGRES_PORT"] } else { "5432" }
$pgUser = if ($envSettings.ContainsKey("POSTGRES_USER")) { $envSettings["POSTGRES_USER"] } else { "postgres" }
$pgPassword = if ($envSettings.ContainsKey("POSTGRES_PASSWORD")) { $envSettings["POSTGRES_PASSWORD"] } else { "postgres" }
$pgDb = if ($envSettings.ContainsKey("POSTGRES_DB")) { $envSettings["POSTGRES_DB"] } else { "game_statistics" }

# SQL 스크립트 경로
$sqlScriptPath = Join-Path -Path $scriptPath -ChildPath "setup-tables.sql"

# SQL 스크립트가 없으면 생성
if (-not (Test-Path -Path $sqlScriptPath)) {
    Write-Host "SQL 스크립트 생성 중: $sqlScriptPath"
    
    $sqlScript = @"
-- 게임 통계 데이터베이스 테이블 생성 스크립트

-- 플레이어 테이블
CREATE TABLE IF NOT EXISTS players (
  player_id VARCHAR(50) PRIMARY KEY,
  player_name VARCHAR(100) NOT NULL,
  joined_at TIMESTAMP NOT NULL,
  vehicle_type VARCHAR(50)
);

-- 플레이어 세션 테이블
CREATE TABLE IF NOT EXISTS player_sessions (
  session_id SERIAL PRIMARY KEY,
  player_id VARCHAR(50) REFERENCES players(player_id),
  joined_at TIMESTAMP NOT NULL,
  left_at TIMESTAMP,
  game_id VARCHAR(50)
);

-- 게임 세션 테이블
CREATE TABLE IF NOT EXISTS game_sessions (
  game_id VARCHAR(50) PRIMARY KEY,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  player_count INT,
  winner_id VARCHAR(50),
  game_mode VARCHAR(50)
);

-- 차량 테이블
CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id VARCHAR(50) PRIMARY KEY,
  player_id VARCHAR(50) REFERENCES players(player_id),
  vehicle_type VARCHAR(50),
  spawned_at TIMESTAMP NOT NULL,
  destroyed_at TIMESTAMP,
  destroyed_by VARCHAR(50),
  position JSONB
);

-- 광고판 파괴 테이블
CREATE TABLE IF NOT EXISTS billboard_destructions (
  id SERIAL PRIMARY KEY,
  billboard_id VARCHAR(50) NOT NULL,
  destroyed_by VARCHAR(50),
  destroyed_at TIMESTAMP NOT NULL,
  position JSONB,
  reward INT
);

-- 아이템 상자 파괴 테이블
CREATE TABLE IF NOT EXISTS item_box_destructions (
  id SERIAL PRIMARY KEY,
  item_box_id VARCHAR(50) NOT NULL,
  destroyed_by VARCHAR(50),
  destroyed_at TIMESTAMP NOT NULL,
  position JSONB,
  rewards JSONB
);

-- 플레이어 통계 테이블
CREATE TABLE IF NOT EXISTS player_statistics (
  player_id VARCHAR(50) PRIMARY KEY REFERENCES players(player_id),
  kills INT DEFAULT 0,
  deaths INT DEFAULT 0,
  hits INT DEFAULT 0,
  shots INT DEFAULT 0,
  missile_fires INT DEFAULT 0,
  missiles_collected INT DEFAULT 0,
  score INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 트리거 설정: 플레이어 생성 시 통계 테이블에 자동 추가
CREATE OR REPLACE FUNCTION create_player_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_statistics (player_id)
  VALUES (NEW.player_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS player_created_trigger ON players;
CREATE TRIGGER player_created_trigger
AFTER INSERT ON players
FOR EACH ROW
EXECUTE FUNCTION create_player_statistics();
"@

    # SQL 스크립트 파일 생성
    Set-Content -Path $sqlScriptPath -Value $sqlScript
}

# PostgreSQL 데이터베이스 생성 및 테이블 설정
Write-Host "PostgreSQL 데이터베이스 설정 중..."
Write-Host "호스트: $pgHost, 포트: $pgPort, 사용자: $pgUser, 데이터베이스: $pgDb"

# 데이터베이스 생성 명령
$createDbCmd = "psql -h $pgHost -p $pgPort -U $pgUser -c ""CREATE DATABASE $pgDb WITH ENCODING='UTF8' OWNER=$pgUser;"" postgres"

# 테이블 생성 명령
$createTablesCmd = "psql -h $pgHost -p $pgPort -U $pgUser -d $pgDb -f ""$sqlScriptPath"""

# 명령 실행
try {
    # PGPASSWORD 환경 변수 설정
    $env:PGPASSWORD = $pgPassword
    
    # 데이터베이스 생성
    Write-Host "데이터베이스 생성 중..."
    Invoke-Expression $createDbCmd
    
    # 테이블 생성
    Write-Host "테이블 생성 중..."
    Invoke-Expression $createTablesCmd
    
    Write-Host "데이터베이스 설정이 완료되었습니다."
}
catch {
    Write-Host "오류: 데이터베이스 설정 중 문제가 발생했습니다."
    Write-Host $_.Exception.Message
}
finally {
    # PGPASSWORD 환경 변수 제거
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
} 