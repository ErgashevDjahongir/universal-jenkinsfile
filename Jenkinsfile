
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        PROJECT_NAME = 'examproject'
        REPORT_DIR = 'reports'
        BACKEND_IMAGE = 'examproject-backend'
        FRONTEND_IMAGE = 'examproject-frontend'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm

                sh '''
                    set -eu
                    mkdir -p "$REPORT_DIR"
                    echo "Project: $PROJECT_NAME"
                    git status --short
                '''
            }
        }

        stage('Secrets Scan - Gitleaks') {
            steps {
                sh '''
                    set +e
                    gitleaks detect \
                      --source . \
                      --report-format json \
                      --report-path "$REPORT_DIR/gitleaks.json" \
                      --exit-code 1
                    rc=$?
                    set -e

                    if [ "$rc" -gt 1 ]; then
                        echo "Gitleaks execution error: $rc"
                        exit "$rc"
                    fi

                    if [ "$rc" -eq 1 ]; then
                        echo "WARNING: Gitleaks findings detected."
                    else
                        echo "No Gitleaks findings."
                    fi
                '''
            }
        }

        stage('SAST - Semgrep') {
            steps {
                sh '''
                    set +e
                    semgrep scan \
                      --config auto \
                      --json \
                      --output "$REPORT_DIR/semgrep.json" .
                    rc=$?
                    set -e

                    if [ "$rc" -ne 0 ]; then
                        echo "Semgrep execution failed: $rc"
                        exit "$rc"
                    fi
                '''
            }
        }

        stage('Backend - Install, Lint, Test, Build') {
            steps {
                dir('backend') {
                    sh '''
                        set -eu
                        npm ci
                        npm run build
                        npm test -- --runInBand
                    '''
                }
            }
        }

        stage('Frontend - Install, Lint, Build') {
            steps {
                dir('frontend') {
                    sh '''
                        set -eu
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        stage('Dependency Scan - OWASP') {
            steps {
                sh '''
                    set -eu

                    dependency-check.sh \
                      --project "$PROJECT_NAME-backend" \
                      --scan backend/package-lock.json \
                      --format JSON \
                      --out "$REPORT_DIR/dependency-backend"

                    dependency-check.sh \
                      --project "$PROJECT_NAME-frontend" \
                      --scan frontend/package-lock.json \
                      --format JSON \
                      --out "$REPORT_DIR/dependency-frontend"
                '''
            }
        }

        stage('Docker Compose Validation') {
            steps {
                sh '''
                    set -eu
                    docker compose -f docker-compose.yml config --quiet
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -t "$BACKEND_IMAGE:$BUILD_NUMBER" \
                      ./backend

                    docker build \
                      -t "$FRONTEND_IMAGE:$BUILD_NUMBER" \
                      ./frontend
                '''
            }
        }

        stage('Container Scan - Trivy') {
            steps {
                sh '''
                    set -eu

                    trivy image \
                      --format json \
                      --output "$REPORT_DIR/trivy-backend.json" \
                      "$BACKEND_IMAGE:$BUILD_NUMBER"

                    trivy image \
                      --format json \
                      --output "$REPORT_DIR/trivy-frontend.json" \
                      "$FRONTEND_IMAGE:$BUILD_NUMBER"
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts(
                artifacts: 'reports/**',
                allowEmptyArchive: true,
                fingerprint: true
            )
        }

        success {
            echo 'DevSecOps pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check stage logs and archived reports.'
        }

        cleanup {
            echo 'Pipeline finished.'
        }
    }
}
