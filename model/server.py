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
from cloudstorage import CloudStorageI

print("Imports completed ...")
bishop = BishopModel()
cloudstorage = CloudStorageI("bdarch-bishop-models")
app = Flask(__name__)
scheduler = APScheduler()
bq = BigQueryI()

# Scheduled Task
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
        # Ensure the timestamp column is in datetime format
        processed_rows['timestamp'] = pd.to_datetime(processed_rows['timestamp'])
        bishop.process_and_train(processed_rows)
        bishop.save_model(base_path='~/MODEL')
        
    except Exception as e:
        print(f"Error in scheduled job: {str(e)}")
        return None

def convert_timestamp_to_minutes(time_query: str):
    if not time_query:
        raise Exception("Missing 'time' in query parameter")
    try:
        time_values = time_query.split(',')
        time_in_minutes = []

        for time_value in time_values:
            if time_value.endswith('m'):
                time_in_minutes.append(int(time_value[:-1]))
            elif time_value.endswith('h'):
                time_in_minutes.append(int(time_value[:-1]) * 60)
            elif time_value.endswith('d'):
                time_in_minutes.append(int(time_value[:-1]) * 1440)
            else:
                raise Exception(f"Invalid time format: {time_value}")
        return time_in_minutes
    except ValueError:
        raise Exception("Invalid time values provided")

# Run prediction
@app.route('/model/coordinates/predict', methods=['GET'])
def predict_coordinates():
    time_query = request.args.get('time')
    time_in_minutes=[]
    try:
        time_in_minutes= convert_timestamp_to_minutes(time_query)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    # Training
    rows = bq.fetch_recent_data()
    processed_rows = []

    for row in rows:
        longitude, latitude = map(float, row['coordinates'].split())
        processed_rows.append({
        "timestamp": row["timestamp"],
        "latitude": latitude,
        "longitude": longitude
        })
        
    processed_rows = pd.DataFrame(processed_rows)
    processed_rows= bishop.process_and_train()
    
    # Prediction
    return bishop.evaluate_model(processed_rows)


# Get all coordinates
@app.route('/model/coordinates', methods=['GET'])
def get_coordinates():
    try:
        # Fetch a smaller number of coordinates for the GET endpoint
        coordinates = bq.fetch_recent_data(limit=100)
        return jsonify(coordinates), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve coordinates: {str(e)}"}), 500


# Insert coordinate
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

# Test endpoint
@app.route('/model/hello', methods=["GET"])
def hello():
    return jsonify({"message": "Hello World"}), 200

if __name__ == '__main__':
    scheduler.init_app(app)
    scheduler.start()
    app.run(debug=True, host='0.0.0.0')