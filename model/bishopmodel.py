import numpy as np
import pandas as pd
from faker import Faker
from datetime import datetime, timedelta
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import pickle
import os
from typing import List, Tuple, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_synthetic_data(num_samples: int = 15000, base_lat: float = 40.0190, base_lon: float = 105.2747) -> pd.DataFrame:
    """Generate basic synthetic location data with timestamps."""
    fake = Faker()
    start_date = fake.date_time_between(start_date='-100d', end_date='-99d')
    timestamps = [start_date + timedelta(minutes=10*i) for i in range(num_samples)]
    latitudes = [base_lat + np.random.normal(0, 0.01) for _ in range(num_samples)]
    longitudes = [base_lon + np.random.normal(0, 0.01) for _ in range(num_samples)]

    df = pd.DataFrame({
        'timestamp': timestamps,
        'latitude': latitudes,
        'longitude': longitudes
    })
    
    return df

class BishopModel:
    def __init__(self, sequence_length: int = 144):
        """Initialize BishopModel with specified sequence length."""
        logging.info("Initializing BishopModel with sequence length: %d", sequence_length)
        self.sequence_length = sequence_length
        self.model = None
        self.scaler_features = MinMaxScaler()
        self.scaler_targets = MinMaxScaler()
    
    def add_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add time-based features to the dataframe."""
        logging.debug("Adding time-based features to the dataframe")
        df['timestamp'] = pd.to_datetime(df['timestamp'])  # Ensure timestamp is datetime
        df['minute_of_day'] = df['timestamp'].dt.hour * 60 + df['timestamp'].dt.minute
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        
        # Optionally add more time features
        df['hour'] = df['timestamp'].dt.hour
        df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
        logging.debug("Time-based features added: %s", df.head())
        return df

    def prepare_data_for_lstm(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Scale features and prepare sequences for LSTM model."""
        logging.info("Preparing data for LSTM with sequence length: %d", self.sequence_length)
        # Reinitalize
        self.scaler_features = MinMaxScaler()
        self.scaler_targets = MinMaxScaler()

        # If the dataframe length is less than the sequence length, duplicate entries
        if len(df) < self.sequence_length:
            logging.warning("Dataframe length (%d) is less than sequence length (%d). Duplicating entries.", len(df), self.sequence_length)
            df = pd.concat([df] * self.sequence_length, ignore_index=True)
            # df = df.iloc[:self.sequence_length]

        self.scaler_features = self.scaler_features.fit_transform(df[['latitude', 'longitude', 'minute_of_day', 'day_of_week']])
        self.scaler_targets = self.scaler_targets.fit_transform(df[['latitude', 'longitude']])
        
        # Ensure self.scaler_features has enough length for sequence creation
        # if len(self.scaler_features) < self.sequence_length:
        #     self.scaler_features = np.tile(self.scaler_features, (self.sequence_length, 1))
        #     self.scaler_targets = np.tile(self.scaler_targets, (self.sequence_length, 1))


        X, y = [], []  # Initialize X and y as empty lists
        for i in range(len(self.scaler_features) - self.sequence_length):
            X.append(self.scaler_features[i:i+self.sequence_length])
            y.append(self.scaler_targets[i+self.sequence_length])

        X = np.array(X)
        y = np.array(y)
        logging.debug("Prepared data shapes - X: %s, y: %s", X.shape, y.shape)
        return X, y

    def build_lstm_model(self, num_features: int = 4) -> tf.keras.Sequential:
        """Create and compile the LSTM model."""
        logging.info("Building LSTM model with %d features", num_features)
        self.model = tf.keras.Sequential([
            tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(128, return_sequences=True), 
                                        input_shape=(self.sequence_length, num_features)),
            tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64, return_sequences=True)),
            tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32)),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(2)
        ])

        self.model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
                    loss='mse', 
                    metrics=['mae'])
        logging.info("LSTM model built and compiled")
        return self.model

    def train_model(self, X_train: np.ndarray, y_train: np.ndarray, epochs: int = 200, batch_size: int = 32) -> tf.keras.callbacks.History:
        """Train the model with early stopping and learning rate reduction."""
        logging.info("Starting model training for %d epochs with batch size %d", epochs, batch_size)
        early_stopping = tf.keras.callbacks.EarlyStopping(patience=20, restore_best_weights=True)
        reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(factor=0.2, patience=5, min_lr=1e-6)

        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            callbacks=[early_stopping, reduce_lr],
            verbose=1
        )
        logging.info("Model training completed")
        return history

    # def evaluate_model(self, X_test: np.ndarray, y_test: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    #     """Evaluate the model and calculate various error metrics."""
    #     logging.info("Evaluating model")
    #     # Basic evaluation
    #     test_loss, test_mae = self.model.evaluate(X_test, y_test)
    #     logging.info("Test Loss: %.4f, Test MAE (scaled): %.4f", test_loss, test_mae)

    #     # Make predictions
    #     predictions = self.model.predict(X_test)
    #     predictions = self.scaler_targets.inverse_transform(predictions)
    #     actual = self.scaler_targets.inverse_transform(y_test)

    #     # Calculate accuracy
    #     mae = np.mean(np.abs(predictions - actual))
    #     rmse = np.sqrt(np.mean((predictions - actual)**2))
    #     logging.info("Mean Absolute Error (degrees): %.4f, Root Mean Square Error (degrees): %.4f", mae, rmse)
        
    #     # Calculate error in kilometers
    #     errors_km = self.haversine_distance(actual[:, 0], actual[:, 1], predictions[:, 0], predictions[:, 1])
    #     mae_km = np.mean(errors_km)
    #     rmse_km = np.sqrt(np.mean(errors_km**2))
    #     logging.info("Mean Absolute Error (km): %.4f, Root Mean Square Error (km): %.4f", mae_km, rmse_km)
        
    #     return predictions, actual

    def predict(self, prediction_request: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Predict coordinates for given timestamps."""
        logging.info("Predicting coordinates for %d requests", len(prediction_request))
        if not hasattr(self.scaler_features, 'data_min_') or not hasattr(self.scaler_targets, 'data_min_'):
            logging.error("Scalers are not fitted. Train the model first or load the scalers.")
            raise ValueError("Scalers are not fitted. Train the model first or load the scalers.")

        timestamps = [pd.to_datetime(req["timestamp"]) for req in prediction_request]
        current_coords = [(req["current_lat"], req["current_long"]) for req in prediction_request]

        df = pd.DataFrame({
            'timestamp': timestamps,
            'latitude': [coord[0] for coord in current_coords],
            'longitude': [coord[1] for coord in current_coords]
        })

        df = self.add_time_features(df)
        predict_scaled_features = self.scaler_features.transform(df[['latitude', 'longitude', 'minute_of_day', 'day_of_week']])

        # Ensure the input has the correct shape for LSTM
        if len(predict_scaled_features) < self.sequence_length:
            logging.warning("Input data length (%d) is less than sequence length (%d). Padding input.", 
                            len(predict_scaled_features), self.sequence_length)
            padding = np.zeros((self.sequence_length - len(predict_scaled_features), predict_scaled_features.shape[1]))
            predict_scaled_features = np.vstack([padding, predict_scaled_features])
        else:
            predict_scaled_features = predict_scaled_features[-self.sequence_length:]

        X = np.expand_dims(predict_scaled_features, axis=0)  # Reshape to (1, sequence_length, num_features)
        logging.debug("Prepared input for prediction: %s", X.shape)

        predictions = self.model.predict(X)
        predicted_coordinates = self.scaler_targets.inverse_transform(predictions)

        results = [
            {
                "timestamp": timestamps[-1].isoformat(),
                "predicted_lat": float(coord[0]),  # Convert to native float
                "predicted_long": float(coord[1])  # Convert to native float
            }
            for coord in predicted_coordinates
        ]
        logging.info("Prediction completed")
        return results

    @staticmethod
    def haversine_distance(lat1: np.ndarray, lon1: np.ndarray, lat2: np.ndarray, lon2: np.ndarray) -> np.ndarray:
        """Calculate distance between two points on Earth using Haversine formula."""
        R = 6371  # Earth's radius in kilometers

        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

        return R * c

    def process_and_train(self, raw_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, tf.keras.callbacks.History]:
        """Process data and train the model without evaluation."""
        logging.info("Processing raw data and training the model")
        # Add time features
        df = self.add_time_features(raw_df)
        
        # Prepare data
        X, y = self.prepare_data_for_lstm(df)
    

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
        logging.debug("Data split into training and testing sets")
        self.scaler_features = MinMaxScaler().fit(df[['latitude', 'longitude', 'minute_of_day', 'day_of_week']])
        self.scaler_targets = MinMaxScaler().fit(df[['latitude', 'longitude']])
    

        # Build and train model
        self.build_lstm_model()
        history = self.train_model(X_train, y_train)
        logging.info("Model training process completed")
        return X_test, y_test, history

def main() -> None:
    logging.info("Starting main function")
    # Generate raw data
    raw_df = generate_synthetic_data()
    
    # Create model and process data
    bishop_model = BishopModel(sequence_length=144)  # 24 hours of data (144 * 10 minutes)
    X_test, y_test, history = bishop_model.process_and_train(raw_df)
    
    # Evaluate model separately
    predictions, actual = bishop_model.evaluate_model(X_test, y_test)
    
    # Save model and scalers
    # bishop_model.save_model()
    logging.info("Main function completed")

if __name__ == "__main__":
    main()