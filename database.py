import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import os
from datetime import datetime

# Load environment variables
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "fire_detection_db")

def get_db_connection():
    """Establishes a connection to the MySQL database."""
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def init_db():
    """Initializes the database and creates the table if it doesn't exist."""
    try:
        # Connect to MySQL Server (without database specified to create it)
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD
        )
        if connection.is_connected():
            cursor = connection.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
            print(f"Database '{DB_NAME}' checked/created.")
            cursor.close()
            connection.close()

        # Connect to the specific database to create table
        connection = get_db_connection()
        if connection and connection.is_connected():
            cursor = connection.cursor()
            
            # Create table with user-specified schema
            create_table_query = """
            CREATE TABLE IF NOT EXISTS fire_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME NOT NULL,
                confidence FLOAT NOT NULL,
                chaos_score FLOAT NOT NULL,
                severity ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
                zone VARCHAR(50) NOT NULL,
                image_path VARCHAR(255) NOT NULL,
                alert_sent BOOLEAN NOT NULL,
                latitude FLOAT,
                longitude FLOAT,
                location_url VARCHAR(255)
            );
            """
            cursor.execute(create_table_query)
            print("Table 'fire_events' checked/created successfully.")
            cursor.close()
            connection.close()
            
    except Error as e:
        print(f"Error initializing database: {e}")

def log_detection(confidence, chaos_score, severity, zone, image_path, alert_sent, lat=None, lon=None, location_url=None):
    """Inserts a new fire event record into the database."""
    connection = get_db_connection()
    if connection:
        try:
            cursor = connection.cursor()
            
            query = """
            INSERT INTO fire_events 
            (timestamp, confidence, chaos_score, severity, zone, image_path, alert_sent, latitude, longitude, location_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            timestamp = datetime.now()
            # map severity to Enum values if needed (ensure uppercase)
            severity = severity.upper()
            if severity not in ['LOW', 'MEDIUM', 'HIGH']:
                severity = 'HIGH' # Default fallback
            
            # Convert numpy types to python native types
            confidence = float(confidence)
            chaos_score = float(chaos_score)
            if lat: lat = float(lat)
            if lon: lon = float(lon)

            values = (timestamp, confidence, chaos_score, severity, zone, image_path, alert_sent, lat, lon, location_url)
            
            cursor.execute(query, values)
            connection.commit()
            print(f"✅ Fire event logged to database (ID: {cursor.lastrowid})")
            
        except Error as e:
            print(f"❌ Failed to log to database: {e}")
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()


