# 🖥️ Windows 개발 환경 설정 가이드

**Version:** v4.0  
**Last Updated:** 2025-01-25  
**Architecture:** Independent Microservices

## 📋 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [필수 소프트웨어 설치](#필수-소프트웨어-설치)
3. [PostgreSQL 설정](#postgresql-설정)
4. [프로젝트 설정](#프로젝트-설정)
5. [마이크로서비스 실행](#마이크로서비스-실행)
6. [nginx 설정](#nginx-설정)
7. [개발 도구 설정](#개발-도구-설정)
8. [문제 해결](#문제-해결)

## 💻 시스템 요구사항

### 최소 요구사항
- **OS**: Windows 10 (1903 이상) 또는 Windows 11
- **RAM**: 8GB 이상 (16GB 권장)
- **Storage**: 10GB 이상 여유 공간
- **CPU**: Intel i5 또는 AMD Ryzen 5 이상

### 권장 사양
- **RAM**: 16GB 이상
- **Storage**: SSD 20GB 이상
- **CPU**: Intel i7 또는 AMD Ryzen 7 이상
- **GPU**: DirectX 11 지원 (WebGL 가속용)

## 🛠️ 필수 소프트웨어 설치

### 1. Node.js 설치

**다운로드**: https://nodejs.org/

```powershell
# 설치 확인
node --version
npm --version

# 예상 출력
# v18.19.0
# 10.2.3
```

**권장 버전**: Node.js 18.x LTS

### 2. Git 설치

**다운로드**: https://git-scm.com/download/win

```powershell
# 설치 확인
git --version

# 예상 출력
# git version 2.43.0.windows.1
```

### 3. PostgreSQL 설치

**다운로드**: https://www.postgresql.org/download/windows/

**설치 옵션**:
- PostgreSQL Server
- pgAdmin 4 (관리 도구)
- Command Line Tools

**설치 시 설정**:
- **Port**: 5432 (기본값)
- **Superuser Password**: 기억하기 쉬운 비밀번호 설정
- **Locale**: Korean, Korea

```powershell
# 설치 확인
psql --version

# 예상 출력
# psql (PostgreSQL) 15.5
```

### 4. nginx 설치

**다운로드**: http://nginx.org/en/download.html

```powershell
# nginx 폴더 생성 및 압축 해제
mkdir C:\nginx
# 다운로드한 nginx 파일을 C:\nginx에 압축 해제

# 설치 확인
cd C:\nginx
.\nginx.exe -v

# 예상 출력
# nginx version: nginx/1.24.0
```

## 🗄️ PostgreSQL 설정

### 1. 데이터베이스 및 사용자 생성

#### PowerShell에서 PostgreSQL 접속
```powershell
# PostgreSQL 서비스 시작 (필요한 경우)
net start postgresql-x64-15

# psql 접속
psql -U postgres -h localhost
```

#### SQL 명령어 실행
```sql
-- User Service용 데이터베이스 생성
CREATE DATABASE user_service;

-- 애플리케이션 사용자 생성
CREATE USER app_user WITH PASSWORD 'app123!@#';

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE user_service TO app_user;

-- 연결 테스트
\c user_service app_user

-- 데이터베이스 목록 확인
\l

-- 종료
\q
```

### 2. 연결 테스트

```powershell
# app_user로 직접 연결 테스트
psql -U app_user -d user_service -h localhost

# 성공 시 다음과 같은 프롬프트가 나타남
# user_service=>
```

### 3. pgAdmin 4 설정 (선택사항)

1. **pgAdmin 4 실행**
2. **서버 추가**:
   - Name: `Local PostgreSQL`
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: 설치 시 설정한 비밀번호

## 📁 프로젝트 설정

### 1. 저장소 클론

```powershell
# 프로젝트 클론
git clone <repository-url>
cd multiplayer-vehicle-game

# 프로젝트 구조 확인
dir
```

### 2. 루트 의존성 설치

```powershell
# 루트 레벨 의존성 설치 (개발 도구)
npm install

# 설치 확인
npm list --depth=0
```

### 3. 각 서비스별 의존성 설치

```powershell
# 모든 서비스 의존성 한번에 설치
npm run install:all

# 또는 개별 설치
npm run install:user
npm run install:game
```

### 4. 환경 변수 설정

#### User Service 환경 변수
```powershell
# services/user-service/.env 파일 생성
New-Item -Path "services\user-service\.env" -ItemType File

# 파일 내용 (메모장으로 편집)
notepad services\user-service\.env
```

**services/user-service/.env 내용**:
```env
# 서버 설정
NODE_ENV=development
PORT=3002

# 데이터베이스 설정
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=user_service
DB_USER=app_user
DB_PASS="app123!@#"

# JWT 설정
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRY=24h

# 프록시 설정 (필요한 경우)
HTTP_PROXY=http://70.10.15.10:8080
HTTPS_PROXY=http://70.10.15.10:8080
NO_PROXY=localhost,127.0.0.1,::1
```

#### Game Service 환경 변수
```powershell
# services/game-service/.env 파일 생성
New-Item -Path "services\game-service\.env" -ItemType File
notepad services\game-service\.env
```

**services/game-service/.env 내용**:
```env
# 서버 설정
NODE_ENV=development
PORT=3001

# JWT 설정 (User Service와 동일해야 함)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

## 🚀 마이크로서비스 실행

### 1. 개별 서비스 실행

#### User Service 실행
```powershell
# 새 PowerShell 창에서
cd C:\pypjt\test2
npm run start:user

# 성공 시 출력
# User Service running on port 3002
# Database connected successfully
```

#### Game Service 실행
```powershell
# 새 PowerShell 창에서
cd C:\pypjt\test2
npm run start:game

# 성공 시 출력
# Game Service running on port 3001
# WebSocket server ready
```

### 2. 모든 서비스 동시 실행 (개발용)

```powershell
# 개발 모드로 모든 서비스 실행
npm run dev:all

# 성공 시 출력
# [user] User Service running on port 3002
# [game] Game Service running on port 3001
# [user] Database connected successfully
# [game] WebSocket server ready
```

### 3. 서비스 상태 확인

```powershell
# User Service 상태 확인
curl http://localhost:3002/api/user/database/info

# Game Service 상태 확인
curl http://localhost:3001/api/status
```

## 🌐 nginx 설정

### 1. nginx 설정 파일 복사

```powershell
# 프로젝트의 nginx.conf를 nginx 폴더로 복사
copy nginx.conf C:\nginx\conf\nginx.conf
```

### 2. nginx 실행

```powershell
# nginx 시작
cd C:\nginx
.\nginx.exe

# 실행 확인
curl http://localhost

# nginx 중지 (필요시)
.\nginx.exe -s quit

# nginx 재시작 (설정 변경 후)
.\nginx.exe -s reload
```

### 3. nginx 서비스 등록 (선택사항)

```powershell
# 관리자 권한으로 PowerShell 실행 후
# NSSM (Non-Sucking Service Manager) 다운로드 및 설치
# https://nssm.cc/download

# nginx를 Windows 서비스로 등록
nssm install nginx C:\nginx\nginx.exe
nssm start nginx
```

## 🛠️ 개발 도구 설정

### 1. Visual Studio Code 설정

**확장 프로그램 설치**:
- **Node.js Extension Pack**
- **PostgreSQL** (by Chris Kolkman)
- **REST Client** (API 테스트용)
- **GitLens** (Git 관리)

**settings.json 설정**:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.env": "dotenv"
  }
}
```

### 2. PowerShell 프로필 설정

```powershell
# PowerShell 프로필 생성
if (!(Test-Path -Path $PROFILE)) {
  New-Item -ItemType File -Path $PROFILE -Force
}

# 프로필 편집
notepad $PROFILE
```

**프로필 내용 추가**:
```powershell
# 프로젝트 디렉토리로 빠른 이동
function goto-project { cd C:\pypjt\test2 }
Set-Alias -Name gp -Value goto-project

# 서비스 시작 함수들
function start-user { npm run start:user }
function start-game { npm run start:game }
function start-all { npm run dev:all }

Set-Alias -Name su -Value start-user
Set-Alias -Name sg -Value start-game
Set-Alias -Name sa -Value start-all

# nginx 관리 함수들
function start-nginx { 
  cd C:\nginx
  .\nginx.exe
  cd C:\pypjt\test2
}

function stop-nginx {
  cd C:\nginx
  .\nginx.exe -s quit
  cd C:\pypjt\test2
}

function reload-nginx {
  copy nginx.conf C:\nginx\conf\nginx.conf
  cd C:\nginx
  .\nginx.exe -s reload
  cd C:\pypjt\test2
}

Set-Alias -Name sn -Value start-nginx
Set-Alias -Name qn -Value stop-nginx
Set-Alias -Name rn -Value reload-nginx
```

### 3. 개발 스크립트 생성

#### start-dev.bat
```batch
@echo off
echo Starting development environment...

echo Starting PostgreSQL...
net start postgresql-x64-15

echo Starting nginx...
cd /d C:\nginx
start /b nginx.exe

echo Starting services...
cd /d C:\pypjt\test2
start "User Service" cmd /k "npm run start:user"
start "Game Service" cmd /k "npm run start:game"

echo Development environment started!
echo.
echo Services:
echo - User Service: http://localhost:3002
echo - Game Service: http://localhost:3001
echo - nginx Gateway: http://localhost
echo.
pause
```

#### stop-dev.bat
```batch
@echo off
echo Stopping development environment...

echo Stopping nginx...
cd /d C:\nginx
nginx.exe -s quit

echo Stopping Node.js processes...
taskkill /f /im node.exe

echo Development environment stopped!
pause
```

## 🔧 문제 해결

### 일반적인 문제들

#### 1. PostgreSQL 연결 실패

**증상**: `password authentication failed for user "app_user"`

**해결방법**:
```powershell
# PostgreSQL 재시작
net stop postgresql-x64-15
net start postgresql-x64-15

# 사용자 재생성
psql -U postgres -h localhost
```

```sql
DROP USER IF EXISTS app_user;
CREATE USER app_user WITH PASSWORD 'app123!@#';
GRANT ALL PRIVILEGES ON DATABASE user_service TO app_user;
```

#### 2. 포트 충돌

**증상**: `EADDRINUSE: address already in use :::3001`

**해결방법**:
```powershell
# 포트 사용 프로세스 확인
netstat -ano | findstr :3001

# 프로세스 종료 (PID 확인 후)
taskkill /PID <PID> /F

# 또는 모든 Node.js 프로세스 종료
taskkill /f /im node.exe
```

#### 3. nginx 시작 실패

**증상**: nginx가 시작되지 않음

**해결방법**:
```powershell
# nginx 오류 로그 확인
cd C:\nginx
type logs\error.log

# 설정 파일 문법 검사
.\nginx.exe -t

# 포트 80 사용 프로세스 확인
netstat -ano | findstr :80
```

#### 4. 환경 변수 인식 실패

**증상**: `.env` 파일의 변수가 인식되지 않음

**해결방법**:
```powershell
# .env 파일 인코딩 확인 (UTF-8이어야 함)
# 메모장에서 다른 이름으로 저장 → 인코딩: UTF-8

# 특수문자 문제 해결
# DB_PASS="app123!@#"  (따옴표 필수)
```

#### 5. npm 의존성 설치 실패

**증상**: `npm install` 실패

**해결방법**:
```powershell
# npm 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# 권한 문제 시 관리자 권한으로 실행
```

### 네트워크 관련 문제

#### 프록시 환경에서의 설정

```powershell
# npm 프록시 설정
npm config set proxy http://70.10.15.10:8080
npm config set https-proxy http://70.10.15.10:8080

# 프록시 해제
npm config delete proxy
npm config delete https-proxy
```

#### 방화벽 설정

```powershell
# Windows 방화벽에서 포트 허용
# 제어판 → 시스템 및 보안 → Windows Defender 방화벽
# 고급 설정 → 인바운드 규칙 → 새 규칙
# 포트: 3001, 3002, 80, 5432 허용
```

### 성능 최적화

#### Node.js 메모리 설정

```powershell
# 메모리 제한 증가 (package.json scripts에 추가)
"start": "node --max-old-space-size=4096 src/index.js"
```

#### PostgreSQL 성능 튜닝

**postgresql.conf 설정** (C:\Program Files\PostgreSQL\15\data\postgresql.conf):
```ini
# 메모리 설정
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# 연결 설정
max_connections = 100
```

## 📋 개발 워크플로우

### 1. 일일 개발 시작

```powershell
# 1. 프로젝트 디렉토리로 이동
gp  # 별칭 사용

# 2. Git 상태 확인
git status
git pull origin main

# 3. 개발 환경 시작
start-dev.bat

# 4. 브라우저에서 확인
# http://localhost (게임 클라이언트)
# http://localhost/api-test.html (API 테스트)
```

### 2. 코드 변경 후 테스트

```powershell
# 1. 서비스 재시작 (nodemon 사용 시 자동)
# Ctrl+C로 서비스 중지 후 재시작

# 2. nginx 설정 변경 시
rn  # reload-nginx 별칭

# 3. 데이터베이스 스키마 변경 시
psql -U app_user -d user_service -h localhost
```

### 3. 개발 종료

```powershell
# 1. 모든 서비스 중지
stop-dev.bat

# 2. Git 커밋
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin feature-branch
```

## 🔍 모니터링 및 로깅

### 로그 파일 위치

```
C:\pypjt\test2\
├── services\user-service\logs\     # User Service 로그
├── services\game-service\logs\     # Game Service 로그
└── C:\nginx\logs\                  # nginx 로그
    ├── access.log
    └── error.log
```

### 실시간 로그 모니터링

```powershell
# PowerShell에서 실시간 로그 확인
Get-Content -Path "C:\nginx\logs\access.log" -Wait -Tail 10

# 또는 Windows Terminal 사용
wt -p "PowerShell" --title "User Service" cmd /k "npm run start:user"; split-pane -p "PowerShell" --title "Game Service" cmd /k "npm run start:game"
```

---

**🎯 이제 Windows에서 완전한 마이크로서비스 개발 환경이 구축되었습니다!**

**💡 팁**: 개발 효율성을 위해 Windows Terminal과 VS Code를 함께 사용하는 것을 권장합니다. 