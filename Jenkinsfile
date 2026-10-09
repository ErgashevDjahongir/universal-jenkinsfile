
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        timeout(time: 60, unit: 'MINUTES')
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    parameters {
        string(
            name: 'DAST_TARGET_URL',
            defaultValue: '',
            description: 'Ixtiyoriy: test/staging ilovaning URL manzili, masalan https://test.example.uz'
        )
    }

    environment {
        BACKEND_IMAGE   = 'examproject-backend'
        FRONTEND_IMAGE  = 'examproject-frontend'
        DEPENDENCY_DATA = '/opt/devsecops/dependency-data-clean'
        TRIVY_CACHE     = '/opt/devsecops/trivy-cache'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                    set -eu
                    mkdir -p reports
                    echo "Project: examproject"
                    git status --short
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

                    docker run --rm \
                      -v "$WORKSPACE:/src" \
                      -w /src \
                      semgrep/semgrep:latest \
                      semgrep scan \
                      --config auto \
                      --json \
                      --output /src/reports/semgrep.json \
                      /src

                    test -s reports/semgrep.json
                '''
            }
        }

        stage('Secrets - Gitleaks') {
            steps {
                sh '''
                    set -eu

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

                    test -d "$DEPENDENCY_DATA" || {
                        echo "ERROR: Dependency-Check data papkasi mavjud emas:"
                        echo "$DEPENDENCY_DATA"
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
                      --noupdate

                    test -s reports/dependency-check-report.json

                    python3 -m json.tool \
                      reports/dependency-check-report.json \
                      > /dev/null
                '''
            }
        }

        stage('Docker Compose Validation') {
            steps {
                sh '''
                    set -eu

                    if [ -f docker-compose.yml ]; then
                        docker compose -f docker-compose.yml config --quiet
                    fi

                    if [ -f docker-compose.prod.yml ]; then
                        docker compose -f docker-compose.prod.yml config --quiet
                    fi
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -f backend/Dockerfile \
                      -t "$BACKEND_IMAGE:$BUILD_NUMBER" \
                      backend

                    docker build \
                      -f frontend/Dockerfile \
                      -t "$FRONTEND_IMAGE:$BUILD_NUMBER" \
                      frontend
                '''
            }
        }

        stage('Container Scan - Trivy') {
            steps {
                sh '''
                    set -eu

                    mkdir -p "$TRIVY_CACHE" reports

                    for IMAGE in \
                      "$BACKEND_IMAGE:$BUILD_NUMBER" \
                      "$FRONTEND_IMAGE:$BUILD_NUMBER"
                    do
                        SAFE_NAME=$(echo "$IMAGE" | tr ':/' '--')

                        docker run --rm \
                          -v "$TRIVY_CACHE:/root/.cache/" \
                          -v "$WORKSPACE/reports:/reports" \
                          aquasec/trivy:latest \
                          image \
                          --format json \
                          --output "/reports/trivy-${SAFE_NAME}.json" \
                          "$IMAGE"

                        test -s "reports/trivy-${SAFE_NAME}.json"
                    done
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

                    TARGET="$DAST_TARGET_URL"

                    case "$TARGET" in
                        http://*|https://*) ;;
                        *)
                            echo "ERROR: DAST_TARGET_URL http:// yoki https:// bilan boshlanishi kerak."
                            exit 1
                            ;;
                    esac

                    mkdir -p "$WORKSPACE/reports/.zap"
                    chmod 777 "$WORKSPACE/reports/.zap"

                    set +e
                    docker run --rm \
                      -v "$WORKSPACE/reports/.zap:/zap/wrk/:rw" \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap-baseline.py \
                      -t "$TARGET" \
                      -J zap-report.json
                    ZAP_EXIT=$?
                    set -e

                    if [ -s "$WORKSPACE/reports/.zap/zap-report.json" ]; then
                        cp "$WORKSPACE/reports/.zap/zap-report.json" \
                           "$WORKSPACE/reports/zap-report.json"
                    fi

                    if [ ! -s "$WORKSPACE/reports/zap-report.json" ]; then
                        echo "ERROR: ZAP JSON hisoboti yaratilmadi."
                        exit 1
                    fi

                    python3 -m json.tool \
                      "$WORKSPACE/reports/zap-report.json" \
                      > /dev/null

                    case "$ZAP_EXIT" in
                        0)
                            echo "ZAP: skanerlash yakunlandi."
                            ;;
                        1)
                            echo "ZAP: ogohlantirishlar mavjud. Hisobotni tekshiring."
                            ;;
                        2|3)
                            echo "ZAP: xavfsizlik muammolari topildi yoki mavjud ogohlantirishlar bilan birga xatolar aniqlandi."
                            exit "$ZAP_EXIT"
                            ;;
                        *)
                            echo "ERROR: ZAP exit code: $ZAP_EXIT"
                            exit 1
                            ;;
                    esac
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
        }

        success {
            echo 'DevSecOps pipeline muvaffaqiyatli yakunlandi.'
        }

        failure {
            echo 'Pipeline muvaffaqiyatsiz. Build loglari va mavjud hisobotlarni tekshiring.'
        }

        cleanup {
            sh '''
                docker image rm \
                  "$BACKEND_IMAGE:$BUILD_NUMBER" \
                  "$FRONTEND_IMAGE:$BUILD_NUMBER" \
                  >/dev/null 2>&1 || true
            '''
        }
    }
}
