print("Whirring the engines ...")
from flask import Flask, request, jsonify
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv
from google.cloud import bigquery
import os
from datetime import datetime
import uuid
from flask_apscheduler import APScheduler
from bigquery import BigQueryI
from bishopmodel import BishopModel
import pandas as pd
from flask_cors import CORS

print("Imports completed ...")
bishop = BishopModel()
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
scheduler = APScheduler()
bq = BigQueryI()

# Add job to scheduler
# Format: second, minute, hour, day, month, day_of_week
@scheduler.task('cron', id='training_job', second='*')  # Runs every second
def scheduled_job():
    print("Running scheduled job to fetch data from BigQuery...")
    try:
        rows = bq.fetch_recent_data()
        processed_rows = []

        for row in rows:
            longitude, latitude = map(float, row['coordinates'].split())
            processed_rows.append({
            "timestamp": row["timestamp"],
            "latitude": latitude,
            "longitude": longitude
            })

        # Convert processed_rows to a DataFrame
        processed_rows = pd.DataFrame(processed_rows)
        
        processed_rows= bishop.process_and_train()
        
        
    except Exception as e:
        print(f"Error in scheduled job: {str(e)}")
        return None

@app.route('/model/coordinates', methods=['GET'])
def get_coordinates():
    try:
        # Fetch a smaller number of coordinates for the GET endpoint
        coordinates = bq.fetch_recent_data(limit=100)
        return jsonify(coordinates), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve coordinates: {str(e)}"}), 500

@app.route('/model/coordinates', methods=['POST'])
def add_coordinates():
    data = request.json
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if latitude is None or longitude is None:
        return jsonify({"error": "Invalid input"}), 400

    errors = bq.insert_coordinates(latitude, longitude)

    if errors:
        return jsonify({"error": "Failed to insert data into BigQuery", "details": errors}), 500

    return jsonify({"message": "Coordinates added successfully"}), 201

@app.route('/model/hello', methods=["GET"])
def hello():
    return jsonify({"message": "Hello World"}), 200

if __name__ == '__main__':
    scheduler.init_app(app)
    scheduler.start()
    app.run(debug=True, host='0.0.0.0')