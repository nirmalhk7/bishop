from prophet import Prophet
import pandas as pd
import numpy as np

class AlternateModel:
    def __init__(self):
        self.lat_model = None
        self.lon_model = None
        self.is_trained = False

    def process_and_train(self, df):
        """
        Train Prophet models for latitude and longitude with all seasonality enabled.
        Expects df with columns: 'timestamp', 'latitude', 'longitude'
        """
        print("Starting training ...")
        df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize(None)
        lat_df = df[['timestamp', 'latitude']].rename(columns={'timestamp': 'ds', 'latitude': 'y'})
        lon_df = df[['timestamp', 'longitude']].rename(columns={'timestamp': 'ds', 'longitude': 'y'})
        
        d
        # Print lat_df as a Python array
        print(lat_df.to_numpy())
        print(lon_df.to_numpy())

        print("Starting fitting ...")
        # Configure and fit the longitude model
        self.lat_model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
            changepoint_prior_scale=0.5,  # Increased flexibility for longitude trends
            seasonality_prior_scale=5.0  # Adjusted seasonality flexibility
        )
        self.lat_model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        self.lat_model.add_seasonality(name='hourly', period=24, fourier_order=3)
        self.lat_model.add_seasonality(name='quarterly', period=91.25, fourier_order=3)  # Added quarterly seasonality

        # Normalize longitude values
        lat_df['y'] = (lat_df['y'] - lat_df['y'].mean()) / lat_df['y'].std()

        # Remove outliers in longitude
        lat_df = lat_df[(lat_df['y'] >= -180) & (lat_df['y'] <= 180)]

        self.lat_model.fit(lat_df)

        # Configure and fit the longitude model
        self.lon_model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
            changepoint_prior_scale=0.1,  # Increased flexibility
            seasonality_prior_scale=15.0  # Increased flexibility
        )
        self.lon_model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        self.lon_model.add_seasonality(name='hourly', period=24, fourier_order=3)  # Added hourly seasonality
        self.lon_model.fit(lon_df)

        print("Completed fitting ...")
        self.is_trained = True

    def predict(self, future_timestamps):
        """
        Predict latitude and longitude for given future timestamps.
        :param future_timestamps: list/array of timestamps (as pd.Timestamp, str, or datetime)
        :return: DataFrame with columns 'timestamp', 'predicted_latitude', 'predicted_longitude'
        """

        print(future_timestamps)
        if not self.is_trained:
            raise Exception("Models are not trained yet")

        if not isinstance(future_timestamps, pd.Series):
            future_timestamps = pd.Series(future_timestamps)

        # Ensure all timestamps are converted to pd.Timestamp and timezone-naive
        future_timestamps = pd.to_datetime(future_timestamps, errors='coerce').dt.tz_localize(None)
        if future_timestamps.isnull().any():
            raise ValueError("Some timestamps could not be converted to datetime")

        future_lat = pd.DataFrame({'ds': future_timestamps})
        future_lon = pd.DataFrame({'ds': future_timestamps})

        lat_forecast = self.lat_model.predict(future_lat)
        lon_forecast = self.lon_model.predict(future_lon)

        predicted = {
            'timestamps': future_timestamps.tolist(),
            'predicted_latitudes': lat_forecast['yhat'].tolist(),
            'predicted_longitudes': lon_forecast['yhat'].tolist()
        }

        return predicted