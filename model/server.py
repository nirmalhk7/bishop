from flask import Flask, request, jsonify
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv
import os

app = Flask(__name__)

# Load environment variables from .env file
load_dotenv()

# InfluxDB configuration
token = os.getenv("INFLUXDB_TOKEN")
org = os.getenv("INFLUXDB_ORG")
bucket = os.getenv("INFLUXDB_BUCKET")
url = os.getenv("INFLUXDB_URL")

client = InfluxDBClient(url=url, token=token)
write_api = client.write_api(write_options=SYNCHRONOUS)

@app.route('/model/coordinates', methods=['POST'])
def add_coordinates():
    data = request.json
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if latitude is None or longitude is None:
        return jsonify({"error": "Invalid input"}), 400

    point = Point("coordinates") \
        .tag("location", "default") \
        .field("latitude", latitude) \
        .field("longitude", longitude) \
        .time(write_precision=WritePrecision.NS)

    write_api.write(bucket=bucket, org=org, record=point)

    return jsonify({"message": "Coordinates added successfully"}), 201

@app.route('/model/coordinates', methods=['GET'])
def last_update():
    query = f'from(bucket: "{bucket}") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "coordinates") |> sort(columns: ["_time"], desc: true) |> limit(n: 1)'
    tables = client.query_api().query(query, org=org)
    
    if not tables or not tables[0].records:
        return jsonify({"error": "No data found"}), 404

    last_record = tables[0].records[0]
    last_update_time = last_record.get_time()

    return jsonify({"last_update": last_update_time.isoformat()}), 200


@app.route('/model/hello', methods=["GET"])
def hello():
    return jsonify({"message": "Hello World"}), 200

if __name__ == '__main__':
    app.run(debug=True)