from pymongo import MongoClient
import os

MONGO_URL = os.getenv(
    "MONGO_URL",
    "mongodb://localhost:27017"
)

client = MongoClient(MONGO_URL)

db = client["productiq"]

products_collection = db["products"]
users_collection = db["users"]


def check_database_connection():
    try:
        client.admin.command("ping")
        return True
    except Exception:
        return False