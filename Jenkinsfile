
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    parameters {
        string(
            name: 'DAST_TARGET_URL',
            defaultValue: '',
            description: 'Ixtiyoriy: ZAP tekshiruvi uchun test server URL manzili'
        )
    }

    environment {
        BACKEND_IMAGE = 'devsecops-demo-backend'
        FRONTEND_IMAGE = 'devsecops-demo-frontend'

        REPORT_DIR = 'reports'
        DEPENDENCY_DATA = '/opt/devsecops/dependency-data-clean'
        TRIVY_CACHE = '/opt/devsecops/trivy-cache'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                    set -eu
                    mkdir -p reports
                    test -f backend/package.json
                    test -f frontend/package.json
                    test -f backend/Dockerfile
                    test -f frontend/Dockerfile
                '''
            }
        }

        stage('SAST - Semgrep') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports

                    set +e
                    docker run --rm \
                      -v "$WORKSPACE:/src" \
                      -w /src \
                      semgrep/semgrep:latest \
                      semgrep scan \
                      --config auto \
                      --json \
                      --output /src/reports/semgrep.json \
                      /src

                    rc=$?
                    set -e

                    # Semgrep: 1 — topilmalar bor;
                    # 2 yoki undan yuqori — ishga tushirish xatosi.
                    if [ "$rc" -gt 1 ]; then
                        exit "$rc"
                    fi

                    test -s reports/semgrep.json
                '''
            }
        }

        stage('Secrets - Gitleaks') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports

                    docker run --rm \
                      -v "$WORKSPACE:/src" \
                      -w /src \
                      ghcr.io/gitleaks/gitleaks:latest \
                      dir /src \
                      --report-format json \
                      --report-path /src/reports/gitleaks.json \
                      --exit-code 1

                    test -s reports/gitleaks.json
                '''
            }
        }

        stage('Backend - Install, Test, Build') {
            steps {
                sh '''
                    set -eu

                    docker run --rm \
                      -v "$WORKSPACE/backend:/app" \
                      -w /app \
                      node:20-bookworm \
                      sh -lc '
                        set -e
                        npm ci
                        npm test -- --runInBand
                        npm run build
                      '
                '''
            }
        }

        stage('Frontend - Install, Build') {
            steps {
                sh '''
                    set -eu

                    docker run --rm \
                      -v "$WORKSPACE/frontend:/app" \
                      -w /app \
                      node:20-bookworm \
                      sh -lc '
                        set -e
                        npm ci
                        npm run build
                      '
                '''
            }
        }

        stage('SCA - OWASP Dependency-Check') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports

                    test -d "$DEPENDENCY_DATA" || {
                        echo "ERROR: Dependency-Check bazasi topilmadi: $DEPENDENCY_DATA"
                        exit 1
                    }

                    docker run --rm \
                      --user "$(id -u):$(id -g)" \
                      -v "$WORKSPACE:/src" \
                      -v "$DEPENDENCY_DATA:/usr/share/dependency-check/data" \
                      owasp/dependency-check:latest \
                      --scan /src/backend \
                      --scan /src/frontend \
                      --format JSON \
                      --out /src/reports \
                      --noupdate \
                      --disableYarnAudit

                    test -s reports/dependency-check-report.json
                    python3 -m json.tool \
                      reports/dependency-check-report.json > /dev/null

                    echo "Dependency-Check hisoboti yaratildi."
                '''
            }
        }

        stage('Docker Compose - Validate') {
            steps {
                sh '''
                    set -eu

                    docker compose \
                      -f docker-compose.yml \
                      -f docker-compose.prod.yml \
                      config -q

                    echo "Docker Compose konfiguratsiyasi to'g'ri."
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -t "$BACKEND_IMAGE:$BUILD_NUMBER" \
                      -f backend/Dockerfile \
                      backend

                    docker build \
                      -t "$FRONTEND_IMAGE:$BUILD_NUMBER" \
                      -f frontend/Dockerfile \
                      frontend
                '''
            }
        }

        stage('Container Scan - Trivy') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports "$TRIVY_CACHE"

                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      -v "$WORKSPACE/reports:/reports" \
                      -v "$TRIVY_CACHE:/root/.cache/" \
                      aquasec/trivy:latest \
                      image \
                      --scanners vuln \
                      --format json \
                      --output "/reports/trivy-backend.json" \
                      "$BACKEND_IMAGE:$BUILD_NUMBER"

                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      -v "$WORKSPACE/reports:/reports" \
                      -v "$TRIVY_CACHE:/root/.cache/" \
                      aquasec/trivy:latest \
                      image \
                      --scanners vuln \
                      --format json \
                      --output "/reports/trivy-frontend.json" \
                      "$FRONTEND_IMAGE:$BUILD_NUMBER"

                    test -s reports/trivy-backend.json
                    test -s reports/trivy-frontend.json
                '''
            }
        }

        stage('DAST - OWASP ZAP') {
            when {
                expression {
                    return params.DAST_TARGET_URL?.trim()
                }
            }

            steps {
                sh '''
                    set -eu

                    docker run --rm \
                      -v "$WORKSPACE/reports:/zap/wrk:rw" \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap-baseline.py \
                      -t "$DAST_TARGET_URL" \
                      -J zap-report.json \
                      -r zap-report.html \
                      -I
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts(
                artifacts: 'reports/**/*,reports/*',
                allowEmptyArchive: true,
                fingerprint: true
            )

            echo 'Pipeline yakunlandi. Mavjud xavfsizlik hisobotlari Jenkins Artifacts bo‘limida saqlanadi.'
        }
    }
}
