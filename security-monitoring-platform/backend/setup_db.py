"""
Database bootstrap script for Security Monitoring Platform.
Creates tables and seeds initial enterprise users if needed.
"""
import sys
from app.core.database import init_db, SessionLocal
from app.main import seed_initial_users

def main():
    print("Initializing Security Monitoring database tables...")
    try:
        init_db()
        seed_initial_users()
        print("✅ Database tables and initial seeds verified successfully.")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
