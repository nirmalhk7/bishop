from google.cloud import storage
import os

class CloudStorageI:
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        print("Env var", os.getenv("ENVIRONMENT"))
        if os.getenv("ENVIRONMENT")!="production":
            print("Reading from file")
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "bdarch-bishop-model.gcp.json"
            
        self.client = storage.Client()
        self.bucket = self.client.bucket(bucket_name)

    def upload_file(self, source_file_path: str, destination_blob_name: str):
        try:
            blob = self.bucket.blob(destination_blob_name)
            blob.upload_from_filename(source_file_path)
            print(CloudStorageI.__name__, f"File {source_file_path} uploaded to {destination_blob_name}.")
        except Exception as e:
            print(CloudStorageI.__name__,f"Error uploading file: {e}")

    def download_file(self, source_blob_name: str, destination_file_path: str):
        try:
            blob = self.bucket.blob(source_blob_name)
            blob.download_to_filename(destination_file_path)
            print(CloudStorageI.__name__,f"File {source_blob_name} downloaded to {destination_file_path}.")
        except Exception as e:
            print(CloudStorageI.__name__,f"Error downloading file: {e}")