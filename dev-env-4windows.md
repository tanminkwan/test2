# Windows 개발 환경 설정 가이드

**Version:** v3.0  
**Last Updated:** 2025-01-25  
**Architecture:** Microservices with JWT Authentication

## ⚠️ 중요 주의사항
**반드시 올바른 디렉토리에서 명령어를 실행하세요!**

- **Nginx**: 반드시 `C:\nginx` 디렉토리에서 실행
- **User Service**: 반드시 `C:\pypjt\test2\services\user-service` 디렉토리에서 실행
- **Game Service**: 반드시 `C:\pypjt\test2\server` 디렉토리에서 실행

**잘못된 예시:**
```cmd
PS C:\pypjt\test2> .\nginx.exe  # ❌ 틀림! nginx.exe가 이 디렉토리에 없음
```

**올바른 예시:**
```cmd
PS C:\pypjt\test2> cd C:\nginx; .\nginx.exe  # ✅ 맞음! 디렉토리 이동 후 실행
```

## 🚨 자주 발생하는 문제 및 해결법

### 1. PowerShell에서 `&&` 연산자 오류
**문제**: `cd C:\nginx && .\nginx.exe` 명령어가 작동하지 않음
**해결**: PowerShell에서는 `;` 사용
```powershell
# ❌ 틀림 (Bash 문법)
cd C:\nginx && .\nginx.exe

# ✅ 맞음 (PowerShell 문법)
cd C:\nginx; .\nginx.exe
```

### 2. User Service 데이터베이스 설정 오류 ⭐ 가장 중요!
**문제**: `Error: Unsupported database configuration: memory/development`
**원인**: `.env` 파일이 없거나 `DB_TYPE=memory`로 설정됨
**해결**: 환경 변수를 직접 설정하여 실행

#### ✅ 올바른 데이터베이스 설정:
- **데이터베이스 이름**: `user_service`
- **사용자 이름**: `app_user` (postgres 아님!)
- **비밀번호**: `app123!@#`
- **호스트**: `localhost`
- **포트**: `5432`

```powershell
# ✅ 올바른 환경 변수 설정
cd services\user-service
$env:DB_TYPE="postgres"; $env:DB_USER="app_user"; $env:DB_PASS="app123!@#"; $env:DB_NAME="user_service"; npm start
```

#### ❌ 잘못된 설정 (사용하지 말 것):
```powershell
# ❌ 틀림 - postgres 사용자 사용
$env:DB_USER="postgres"; $env:DB_PASS="375aa60b11d449cab107f6dd168a6bee"
```

### 3. JWT 토큰 불일치 오류 ⭐ 중요!
**문제**: `invalid signature` 오류로 게임 접속 불가
**원인**: User Service와 Game Service의 JWT_SECRET이 다름
**해결**: 두 서비스 모두 동일한 JWT_SECRET 사용

```powershell
# User Service 시작 시
cd services\user-service
$env:JWT_SECRET="your-super-secret-jwt-key-change-in-production"; $env:DB_TYPE="postgres"; $env:DB_USER="app_user"; $env:DB_PASS="app123!@#"; $env:DB_NAME="user_service"; npm start

# Game Service 시작 시
cd server
$env:JWT_SECRET="your-super-secret-jwt-key-change-in-production"; npm start
```

### 4. Nginx 설정 파일 위치 문제
**문제**: 프로젝트 폴더의 `nginx.conf`가 적용되지 않음
**해결**: 설정 파일을 nginx 설치 폴더로 복사
```powershell
# 프로젝트의 nginx.conf를 nginx 설치 폴더로 복사
copy nginx.conf C:\nginx\conf\nginx.conf

# 설정 파일 검증
cd C:\nginx; .\nginx.exe -t
```

### 5. Nginx 설정 파일 복사 + 실행 (한 번에) ⭐ 추천!
**방법**: 디렉토리 이동, 설정 파일 복사, nginx 실행을 한 번에 처리
```powershell
# 한 번에 처리: 디렉토리 이동 → 설정 복사 → nginx 실행
cd C:\nginx; copy C:\pypjt\test2\nginx.conf C:\nginx\conf\nginx.conf; .\nginx.exe

# 또는 nginx 중지 후 재시작
cd C:\nginx; .\nginx.exe -s quit; copy C:\pypjt\test2\nginx.conf C:\nginx\conf\nginx.conf; .\nginx.exe
```

### 6. Rate Limiting 오류
**문제**: `429 Too Many Requests` 오류
**원인**: API 호출 제한 초과
**해결**: 잠시 기다리거나 Rate Limit 설정 조정

### 7. WebSocket 연결 실패
**문제**: Socket.IO 연결이 안됨
**원인**: nginx WebSocket 프록시 설정 문제
**해결**: nginx.conf에서 WebSocket 설정 확인

## 1. 필수 소프트웨어 설치

### PostgreSQL 설치
1. **다운로드**: https://www.postgresql.org/download/windows/
2. **설치 과정**:
   - PostgreSQL 15.x 버전 선택
   - 설치 경로: `C:\Program Files\PostgreSQL\15`
   - 포트: `5432` (기본값)
   - 슈퍼유저 비밀번호 설정 (예: `postgres123`)
   - Locale: `Korean, Korea`

3. **환경 변수 설정**:
   ```
   PATH에 추가: C:\Program Files\PostgreSQL\15\bin
   ```

### Nginx 설치
1. **다운로드**: http://nginx.org/en/download.html
   - Stable version 선택 (nginx/Windows-x.x.x)
2. **설치**:
   - 압축 해제: `C:\nginx`
   - 폴더 구조 확인:
     ```
     C:\nginx\
     ├── conf\
     ├── html\
     ├── logs\
     └── nginx.exe
     ```

## 2. 데이터베이스 설정

### PostgreSQL 데이터베이스 생성
```sql
-- psql 접속 (관리자 권한으로 cmd 실행)
psql -U postgres -h localhost

-- User Service용 데이터베이스 및 사용자 생성
CREATE DATABASE user_service;
CREATE USER app_user WITH PASSWORD 'app123!@#';
GRANT ALL PRIVILEGES ON DATABASE user_service TO app_user;

-- 연결 테스트
\l  -- 데이터베이스 목록 확인
\q  -- 종료
```

### 데이터베이스 연결 테스트
```powershell
# 올바른 사용자로 연결 테스트
psql -U app_user -h localhost -d user_service
# 비밀번호 입력: app123!@#
```

## 3. 시스템 아키텍처 이해

### 서비스 구성
```
Client (Browser) 
    ↓ HTTP/WebSocket
Nginx (Port 80) - API Gateway
    ↓ Proxy
├── User Service (Port 3002) - 인증 및 사용자 관리
│   └── PostgreSQL (user_service DB)
└── Game Service (Port 3001) - 게임 로직
```

### 인증 플로우
1. **로그인**: Client → Nginx → User Service → PostgreSQL
2. **JWT 토큰 발급**: User Service → Client
3. **게임 접속**: Client → Nginx (JWT 검증) → Game Service

## 4. 서비스 시작 순서 ⭐ 중요!

### 1단계: PostgreSQL 서비스 시작
```cmd
# 서비스 상태 확인
sc query postgresql-x64-15

# 서비스 시작 (관리자 권한)
net start postgresql-x64-15

# 연결 테스트
psql -U app_user -h localhost -d user_service
```

### 2단계: User Service 시작
```powershell
# User Service 디렉토리로 이동
cd services\user-service

# 환경변수 설정 및 서비스 시작
$env:DB_TYPE="postgres"; $env:DB_USER="app_user"; $env:DB_PASS="app123!@#"; $env:DB_NAME="user_service"; $env:JWT_SECRET="your-super-secret-jwt-key-change-in-production"; npm start
```

**성공 시 출력:**
```
✅ Database tables synchronized.
🚀 User Service running on port 3002
📊 Health check: http://localhost:3002/health
```

### 3단계: Game Service 시작
```powershell
# 새 PowerShell 창에서 실행
cd server

# 환경변수 설정 및 서비스 시작
$env:JWT_SECRET="your-super-secret-jwt-key-change-in-production"; npm start
```

**성공 시 출력:**
```
🚀 Game Server running on 0.0.0.0:3001
📊 Server Status: http://localhost:3001/api/status
```

### 4단계: Nginx 시작
```powershell
# 새 PowerShell 창에서 실행
cd C:\nginx; copy C:\pypjt\test2\nginx.conf C:\nginx\conf\nginx.conf; .\nginx.exe
```

## 5. 서비스 테스트

### 서비스 상태 확인
```powershell
# User Service 상태
curl http://localhost:3002/health

# Game Service 상태
curl http://localhost:3001/api/status

# Nginx를 통한 접근 테스트
curl http://localhost/api/auth/users/verify-token
```

### 게임 접속 테스트
1. **브라우저에서 접속**: http://localhost
2. **회원가입 또는 로그인**
3. **차량 선택**
4. **게임 입장**

### API 테스트 페이지
- **User Service API 테스트**: http://localhost/api-test.html

## 6. 문제 해결 체크리스트

### 인증 관련 문제
- [ ] User Service와 Game Service의 JWT_SECRET이 동일한가?
- [ ] 데이터베이스 사용자가 `app_user`인가? (`postgres` 아님)
- [ ] 데이터베이스 비밀번호가 `app123!@#`인가?

### 네트워크 관련 문제
- [ ] 모든 서비스가 올바른 포트에서 실행 중인가?
- [ ] nginx.conf 파일이 올바른 위치에 복사되었는가?
- [ ] 방화벽이 포트를 차단하고 있지 않은가?

### 성능 관련 문제
- [ ] GPU 드라이버가 최신인가?
- [ ] Chrome에서 하드웨어 가속이 활성화되어 있는가?
- [ ] 메모리 사용량이 과도하지 않은가?

## 7. 로그 파일 위치

### 서비스별 로그
- **User Service**: `services/user-service/logs/`
- **Game Service**: `server/logs/`
- **Nginx**: `C:\nginx\logs\access.log`, `C:\nginx\logs\error.log`

### 로그 확인 방법
```powershell
# Nginx 에러 로그 확인
Get-Content C:\nginx\logs\error.log -Tail 10

# User Service 로그 확인 (콘솔 출력)
# Game Service 로그 확인 (콘솔 출력)
```

## 8. 개발 환경 최적화

### Chrome 브라우저 설정
1. **주소창에 입력**: `chrome://flags/`
2. **다음 플래그 활성화**:
   - `#enable-gpu-rasterization` → **Enabled**
   - `#enable-zero-copy` → **Enabled**
   - `#ignore-gpu-blacklist` → **Enabled**
   - `#enable-webgl2-compute-context` → **Enabled**

### PowerShell 프로필 설정 (선택사항)
```powershell
# PowerShell 프로필 생성
New-Item -Type File -Path $PROFILE -Force

# 자주 사용하는 명령어 별칭 추가
Add-Content $PROFILE @"
# 게임 개발 환경 별칭
function Start-UserService { 
    cd C:\pypjt\test2\services\user-service
    `$env:DB_TYPE="postgres"; `$env:DB_USER="app_user"; `$env:DB_PASS="app123!@#"; `$env:DB_NAME="user_service"; `$env:JWT_SECRET="your-super-secret-jwt-key-change-in-production"; npm start
}

function Start-GameService { 
    cd C:\pypjt\test2\server
    `$env:JWT_SECRET="your-super-secret-jwt-key-change-in-production"; npm start
}

function Start-Nginx { 
    cd C:\nginx; copy C:\pypjt\test2\nginx.conf C:\nginx\conf\nginx.conf; .\nginx.exe
}
"@
```

## 9. 보안 고려사항

### 프로덕션 환경 설정
```powershell
# 프로덕션용 JWT 시크릿 생성 (예시)
$env:JWT_SECRET="$(New-Guid)-$(Get-Date -Format 'yyyyMMddHHmmss')-production"

# 데이터베이스 비밀번호 변경
# PostgreSQL에서 실행:
# ALTER USER app_user WITH PASSWORD 'new-secure-password';
```

### 방화벽 설정
```cmd
# Windows 방화벽에서 포트 허용 (관리자 권한)
netsh advfirewall firewall add rule name="Game Server" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="User Service" dir=in action=allow protocol=TCP localport=3002
netsh advfirewall firewall add rule name="Game Service" dir=in action=allow protocol=TCP localport=3001
```

## 10. 백업 및 복구

### 데이터베이스 백업
```powershell
# 데이터베이스 백업
pg_dump -U app_user -h localhost user_service > backup_$(Get-Date -Format 'yyyyMMdd').sql

# 데이터베이스 복구
psql -U app_user -h localhost user_service < backup_20250125.sql
```

### 설정 파일 백업
```powershell
# 중요 설정 파일 백업
copy C:\nginx\conf\nginx.conf nginx_backup_$(Get-Date -Format 'yyyyMMdd').conf
copy services\user-service\.env user_service_env_backup_$(Get-Date -Format 'yyyyMMdd').txt
```

---

**🎮 개발 환경 설정 완료!**

**⚠️ 주의**: 프로덕션 환경에서는 반드시 JWT_SECRET, 데이터베이스 비밀번호 등을 변경하세요! 