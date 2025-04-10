from flask import Flask, request, jsonify
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv
from google.cloud import bigquery
import os
from datetime import datetime
import uuid

class BigQueryI:
    def __init__(self):
        # Load environment variables from .env file
        load_dotenv()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "bdarch-bishop-model.gcp.json")
        
        # BigQuery configuration
        self.client = bigquery.Client()
        print("Connected to BigQuery:", self.client.project)
        self.dataset_id = "timeseries_data_location"
        self.table_id = "timeseries_location_table"
    
    def insert_coordinates(self, latitude, longitude):
        # Prepare the row to insert into BigQuery
        row = [
            {
                "id": str(uuid.uuid4()),
                "timestamp": datetime.now().isoformat(),
                "coordinates": f"{longitude} {latitude}",
            }
        ]

        # Insert the row into BigQuery
        table_ref = f"{self.dataset_id}.{self.table_id}"
        errors = self.client.insert_rows_json(table_ref, row)
        
        return errors
    
    def fetch_recent_data(self, limit=1000):
        try:
            # Create a query to fetch recent data
            query = f"""
            SELECT id, timestamp, coordinates
            FROM `{self.dataset_id}.{self.table_id}`
            ORDER BY timestamp DESC
            LIMIT {limit}
            """
            
            # Run the query
            query_job = self.client.query(query)
            
            # Wait for the query to complete
            results = query_job.result()
            
            # Process the results
            rows = []
            for row in results:
                rows.append({
                    "id": row.id,
                    "timestamp": row.timestamp.isoformat() if hasattr(row.timestamp, 'isoformat') else row.timestamp,
                    "coordinates": row.coordinates
                })
            
            print(f"Retrieved {len(rows)} records from BigQuery")
            return rows
            
        except Exception as e:
            print(f"Error fetching data from BigQuery: {str(e)}")
            return None