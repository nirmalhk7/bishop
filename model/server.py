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
from alternatemodel import AlternateModel
import pandas as pd
from cloudstorage import CloudStorageI

print("Imports completed ...")
bishop = BishopModel()
cloudstorage = CloudStorageI("bdarch-bishop-models")
app = Flask(__name__)
scheduler = APScheduler()
bq = BigQueryI()

# Scheduled Task
@scheduler.task('interval', id='training_job', seconds=10) 
def scheduled_job():
    print("Running scheduled job to fetch data from BigQuery...")
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
    # bishop.save_model(base_path='~/MODEL')


# Run prediction
@app.route('/model/coordinates/predict', methods=['GET'])
def predict_coordinates():
    data = request.json
    prediction_request = data.get('prediction_request', [])
    return bishop.predict(prediction_request)


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
    return jsonify({"message": "Hello World from the Model Server"}), 200

if __name__ == '__main__':


    print("Running the scheduled job before starting the server...")
    if os.environ.get("RUN_SCHEDULED_JOB_ONCE") != "true":
        print("Running the scheduled job before starting the server...")
        scheduled_job()
        os.environ["RUN_SCHEDULED_JOB_ONCE"] = "true"

    scheduler.init_app(app)
    scheduler.start()

    app.run(debug=True, host='0.0.0.0')