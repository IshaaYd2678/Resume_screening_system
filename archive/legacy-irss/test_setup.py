#!/usr/bin/env python3
"""
IRSS Setup Verification Script
Tests that all components are properly configured
"""

import sys
import os
from pathlib import Path

def test_file_structure():
    """Test that all required files exist."""
    print("🔍 Testing file structure...")
    
    required_files = [
        ".env.example",
        "README.md",
        "QUICKSTART.md",
        "PROJECT_STATUS.md",
        "Makefile",
        "setup.sh",
        "setup.ps1",
        "backend/requirements.txt",
        "backend/Dockerfile",
        "backend/app/main.py",
        "backend/app/core/config.py",
        "backend/app/core/database.py",
        "backend/app/core/security.py",
        "backend/app/models/__init__.py",
        "backend/app/api/auth.py",
        "backend/app/api/jobs.py",
        "backend/app/api/candidates.py",
        "backend/app/api/resumes.py",
        "backend/app/api/health.py",
        "backend/app/nlp/extraction.py",
        "backend/app/nlp/parser.py",
        "backend/app/nlp/embedding.py",
        "backend/app/nlp/scorer.py",
        "backend/app/nlp/explainer.py",
        "backend/app/nlp/ollama_client.py",
        "backend/app/nlp/spacy_utils.py",
        "backend/app/tasks.py",
        "backend/app/celery_app.py",
        "backend/app/schemas/common.py",
        "frontend/package.json",
        "frontend/Dockerfile",
        "frontend/src/App.tsx",
        "frontend/src/main.tsx",
        "frontend/src/lib/api.ts",
        "frontend/src/lib/store.ts",
        "frontend/src/pages/LoginPage.tsx",
        "frontend/src/pages/JobsPage.tsx",
        "frontend/src/pages/CandidatesPage.tsx",
        "frontend/src/components/Layout.tsx",
        "infra/docker-compose.yml",
        "infra/postgres/init.sql",
        "infra/caddy/Caddyfile",
    ]
    
    missing = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing.append(file_path)
    
    if missing:
        print(f"❌ Missing files:")
        for f in missing:
            print(f"   - {f}")
        return False
    
    print(f"✅ All {len(required_files)} required files exist")
    return True


def test_python_imports():
    """Test that Python code can be imported."""
    print("\n🔍 Testing Python imports...")
    
    sys.path.insert(0, str(Path("backend").absolute()))
    
    try:
        from app.core import config
        print("✅ app.core.config")
        
        from app.core import database
        print("✅ app.core.database")
        
        from app.core import security
        print("✅ app.core.security")
        
        from app import models
        print("✅ app.models")
        
        from app.nlp import extraction
        print("✅ app.nlp.extraction")
        
        from app.nlp import parser
        print("✅ app.nlp.parser")
        
        from app.nlp import embedding
        print("✅ app.nlp.embedding")
        
        from app.nlp import scorer
        print("✅ app.nlp.scorer")
        
        from app.nlp import explainer
        print("✅ app.nlp.explainer")
        
        from app.nlp import ollama_client
        print("✅ app.nlp.ollama_client")
        
        from app import tasks
        print("✅ app.tasks")
        
        from app import celery_app
        print("✅ app.celery_app")
        
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False


def test_env_file():
    """Test that .env.example has all required variables."""
    print("\n🔍 Testing environment configuration...")
    
    required_vars = [
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "POSTGRES_HOST",
        "REDIS_URL",
        "JWT_SECRET_KEY",
        "OLLAMA_BASE_URL",
        "MODEL_PARSE",
        "MODEL_EXPLAIN",
        "MODEL_EMBED",
        "MINIO_ENDPOINT",
        "MINIO_ROOT_USER",
        "MINIO_ROOT_PASSWORD",
        "CELERY_BROKER_URL",
        "CELERY_RESULT_BACKEND",
    ]
    
    try:
        with open(".env.example") as f:
            content = f.read()
        
        missing = []
        for var in required_vars:
            if var not in content:
                missing.append(var)
        
        if missing:
            print(f"❌ Missing environment variables:")
            for v in missing:
                print(f"   - {v}")
            return False
        
        print(f"✅ All {len(required_vars)} required environment variables present")
        return True
    except Exception as e:
        print(f"❌ Error reading .env.example: {e}")
        return False


def test_docker_compose():
    """Test that docker-compose.yml is valid."""
    print("\n🔍 Testing Docker Compose configuration...")
    
    try:
        import yaml
        
        with open("infra/docker-compose.yml") as f:
            config = yaml.safe_load(f)
        
        required_services = [
            "postgres",
            "redis",
            "ollama",
            "minio",
            "api",
            "worker",
            "frontend",
            "caddy",
            "prometheus",
            "grafana",
            "jaeger",
            "loki",
            "promtail",
        ]
        
        services = config.get("services", {})
        missing = [s for s in required_services if s not in services]
        
        if missing:
            print(f"❌ Missing services:")
            for s in missing:
                print(f"   - {s}")
            return False
        
        print(f"✅ All {len(required_services)} required services defined")
        return True
    except Exception as e:
        print(f"❌ Error parsing docker-compose.yml: {e}")
        return False


def test_api_endpoints():
    """Test that all API endpoints are defined."""
    print("\n🔍 Testing API endpoint definitions...")
    
    endpoints = {
        "auth.py": ["register", "token", "me"],
        "jobs.py": ["list_jobs", "create_job", "get_job", "update_job", "get_job_status", "get_job_candidates"],
        "candidates.py": ["get_candidate", "get_candidate_scores", "get_candidate_explanation"],
        "resumes.py": ["upload_resumes"],
        "health.py": ["health_check"],
    }
    
    all_found = True
    for file, funcs in endpoints.items():
        file_path = Path(f"backend/app/api/{file}")
        if not file_path.exists():
            print(f"❌ Missing file: {file}")
            all_found = False
            continue
        
        content = file_path.read_text()
        missing = [f for f in funcs if f not in content]
        
        if missing:
            print(f"❌ Missing endpoints in {file}:")
            for f in missing:
                print(f"   - {f}")
            all_found = False
        else:
            print(f"✅ {file}: all {len(funcs)} endpoints defined")
    
    return all_found


def test_frontend_pages():
    """Test that all frontend pages exist."""
    print("\n🔍 Testing frontend pages...")
    
    pages = [
        "LoginPage.tsx",
        "JobsPage.tsx",
        "CandidatesPage.tsx",
    ]
    
    all_found = True
    for page in pages:
        file_path = Path(f"frontend/src/pages/{page}")
        if not file_path.exists():
            print(f"❌ Missing page: {page}")
            all_found = False
        else:
            print(f"✅ {page}")
    
    return all_found


def main():
    """Run all tests."""
    print("=" * 60)
    print("IRSS Setup Verification")
    print("=" * 60)
    
    tests = [
        ("File Structure", test_file_structure),
        ("Python Imports", test_python_imports),
        ("Environment Config", test_env_file),
        ("Docker Compose", test_docker_compose),
        ("API Endpoints", test_api_endpoints),
        ("Frontend Pages", test_frontend_pages),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} test failed with exception: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! The project is ready to run.")
        print("\nNext steps:")
        print("  1. Run: ./setup.ps1 (Windows) or ./setup.sh (Linux/macOS)")
        print("  2. Access: http://localhost:3000")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
