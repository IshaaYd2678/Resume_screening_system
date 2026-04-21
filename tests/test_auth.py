"""Test authentication endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import User
from app.core.security import hash_password

client = TestClient(app)


def test_register_user(db_session):
    """Test user registration."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"


def test_login_success(db_session):
    """Test successful login."""
    # Create user
    user = User(
        email="user@example.com",
        hashed_password=hash_password("password123"),
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    
    # Login
    response = client.post(
        "/api/v1/auth/token",
        json={
            "email": "user@example.com",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_invalid_password(db_session):
    """Test login with invalid password."""
    user = User(
        email="user@example.com",
        hashed_password=hash_password("password123"),
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    
    response = client.post(
        "/api/v1/auth/token",
        json={
            "email": "user@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert "status" in response.json()
