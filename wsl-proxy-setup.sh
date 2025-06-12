#!/bin/bash

# WSL Ubuntu 프록시 설정 스크립트
echo "WSL Ubuntu 프록시 설정을 시작합니다..."

PROXY_SERVER="http://70.10.15.10:8080"

# 1. 환경 변수 설정 (.bashrc에 추가)
echo "# 프록시 설정" >> ~/.bashrc
echo "export http_proxy=$PROXY_SERVER" >> ~/.bashrc
echo "export https_proxy=$PROXY_SERVER" >> ~/.bashrc
echo "export HTTP_PROXY=$PROXY_SERVER" >> ~/.bashrc
echo "export HTTPS_PROXY=$PROXY_SERVER" >> ~/.bashrc
echo "export no_proxy=localhost,127.0.0.1,::1" >> ~/.bashrc
echo "export NO_PROXY=localhost,127.0.0.1,::1" >> ~/.bashrc

# 2. APT 프록시 설정
sudo mkdir -p /etc/apt/apt.conf.d/
echo "Acquire::http::Proxy \"$PROXY_SERVER\";" | sudo tee /etc/apt/apt.conf.d/95proxies
echo "Acquire::https::Proxy \"$PROXY_SERVER\";" | sudo tee -a /etc/apt/apt.conf.d/95proxies

# 3. Git 프록시 설정
git config --global http.proxy $PROXY_SERVER
git config --global https.proxy $PROXY_SERVER

# 4. npm 프록시 설정 (Node.js 사용 시)
if command -v npm &> /dev/null; then
    npm config set proxy $PROXY_SERVER
    npm config set https-proxy $PROXY_SERVER
fi

# 5. 현재 세션에 환경 변수 적용
export http_proxy=$PROXY_SERVER
export https_proxy=$PROXY_SERVER
export HTTP_PROXY=$PROXY_SERVER
export HTTPS_PROXY=$PROXY_SERVER
export no_proxy=localhost,127.0.0.1,::1
export NO_PROXY=localhost,127.0.0.1,::1

echo "프록시 설정이 완료되었습니다!"
echo "프록시 서버: $PROXY_SERVER"
echo ""
echo "설정된 내용:"
echo "- 환경 변수 (.bashrc)"
echo "- APT 패키지 매니저"
echo "- Git"
echo "- npm (설치된 경우)"
echo ""
echo "새 터미널을 열거나 'source ~/.bashrc'를 실행하여 설정을 적용하세요." 