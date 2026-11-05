"""
Creates a portal operator (every operator is a full administrator):
    python -m backend.create_operator kareena@grandtravelcruise.com "Kareena Islam"
Use this for the first accounts. After that, admins can invite staff from the CRM's Staff page.
Prompts for the password so it never lands in shell history.
"""
import getpass
import sys

from backend.database import SessionLocal, init_db
from backend.models import OperatorUser
from backend.services.auth_service import create_operator, normalize_email


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    email, full_name = normalize_email(sys.argv[1]), sys.argv[2]
    password = getpass.getpass("New password (12+ characters): ")
    if len(password) < 12 or password != getpass.getpass("Repeat password: "):
        print("Passwords must match and be at least 12 characters.")
        return 1
    init_db()
    with SessionLocal() as db:
        if db.query(OperatorUser).filter(OperatorUser.email == email).first():
            print(f"{email} already exists.")
            return 1
        create_operator(db, email, password, full_name)
    print(f"Created operator {email}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
