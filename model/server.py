from flask import Flask, request, jsonify
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv
from google.cloud import bigquery
import os
from datetime import datetime
import uuid
from model import 

app = Flask(__name__)


# Load environment variables from .env file
load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "bdarch-bishop-model.gcp.json")

# BigQuery configuration
bigquery_client = bigquery.Client()
print("Connected to BigQuery:", bigquery_client.project)
dataset_id = "timeseries_data_location"
table_id = "timeseries_location_table"

@app.route('/model/coordinates', methods=['POST'])
def add_coordinates():
    data = request.json
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if latitude is None or longitude is None:
        return jsonify({"error": "Invalid input"}), 400

    # Prepare the row to insert into BigQuery
    row = [
        {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "coordinates": f"{longitude} {latitude}",
        }
    ]

    # Insert the row into BigQuery
    table_ref = f"{dataset_id}.{table_id}"
    errors = bigquery_client.insert_rows_json(table_ref, row)

    if errors:
        return jsonify({"error": "Failed to insert data into BigQuery", "details": errors}), 500

    return jsonify({"message": "Coordinates added successfully"}), 201



@app.route('/model/hello', methods=["GET"])
def hello():
    return jsonify({"message": "Hello World"}), 200

if __name__ == '__main__':
    app.run(debug=True)