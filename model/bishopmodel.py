import numpy as np
import pandas as pd
from faker import Faker
from datetime import datetime, timedelta
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import pickle

def generate_synthetic_data(num_samples=15000, base_lat=40.0190, base_lon=105.2747):
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
    def __init__(self, sequence_length=144):
        """Initialize BishopModel with specified sequence length."""
        print("Initializing Bishop ...")
        self.sequence_length = sequence_length
        self.model = None
        self.scaler_features = None
        self.scaler_targets = None
    
    def add_time_features(self, df):
        """Add time-based features to the dataframe."""
        # Add time-based features
        df['minute_of_day'] = df['timestamp'].dt.hour * 60 + df['timestamp'].dt.minute
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        
        # Optionally add more time features
        df['hour'] = df['timestamp'].dt.hour
        df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
        
        return df

    def prepare_data_for_lstm(self, df):
        """Scale features and prepare sequences for LSTM model."""
        self.scaler_features = MinMaxScaler()
        self.scaler_targets = MinMaxScaler()

        scaled_features = self.scaler_features.fit_transform(df[['latitude', 'longitude', 'minute_of_day', 'day_of_week']])
        scaled_targets = self.scaler_targets.fit_transform(df[['latitude', 'longitude']])

        X, y = [], []
        for i in range(len(scaled_features) - self.sequence_length):
            X.append(scaled_features[i:i+self.sequence_length])
            y.append(scaled_targets[i+self.sequence_length])

        X = np.array(X)
        y = np.array(y)
        
        return X, y

    def build_lstm_model(self, num_features=4):
        """Create and compile the LSTM model."""
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
        
        return self.model

    def train_model(self, X_train, y_train, epochs=200, batch_size=32):
        """Train the model with early stopping and learning rate reduction."""
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
        
        return history

    def evaluate_model(self, X_test, y_test):
        """Evaluate the model and calculate various error metrics."""
        # Basic evaluation
        test_loss, test_mae = self.model.evaluate(X_test, y_test)
        print(f"Test MAE (scaled): {test_mae}")

        # Make predictions
        predictions = self.model.predict(X_test)
        predictions = self.scaler_targets.inverse_transform(predictions)
        actual = self.scaler_targets.inverse_transform(y_test)

        # Calculate accuracy
        mae = np.mean(np.abs(predictions - actual))
        rmse = np.sqrt(np.mean((predictions - actual)**2))
        print(f"Mean Absolute Error (degrees): {mae}")
        print(f"Root Mean Square Error (degrees): {rmse}")
        
        # Calculate error in kilometers
        errors_km = self.haversine_distance(actual[:, 0], actual[:, 1], predictions[:, 0], predictions[:, 1])
        mae_km = np.mean(errors_km)
        rmse_km = np.sqrt(np.mean(errors_km**2))

        print(f"Mean Absolute Error (km): {mae_km}")
        print(f"Root Mean Square Error (km): {rmse_km}")
        
        return predictions, actual

    @staticmethod
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two points on Earth using Haversine formula."""
        R = 6371  # Earth's radius in kilometers

        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

        return R * c

    def save_model(self, base_path='/content/drive/MyDrive/DevWorld/bdarch'):
        """Save the model and scalers to disk."""
        model_save_path = f'{base_path}/location_prediction_model.pkl'
        scaler_features_save_path = f'{base_path}/location_prediction_scaler_features.pkl'
        scaler_targets_save_path = f'{base_path}/location_prediction_scaler_targets.pkl'

        # Save the model
        with open(model_save_path, 'wb') as f:
            pickle.dump(self.model, f)

        # Save the scalers
        with open(scaler_features_save_path, 'wb') as f:
            pickle.dump(self.scaler_features, f)

        with open(scaler_targets_save_path, 'wb') as f:
            pickle.dump(self.scaler_targets, f)
        
        print("Model and scalers saved successfully")
    
    def load_model(self, base_path='/content/drive/MyDrive/DevWorld/bdarch'):
        """Load the model and scalers from disk."""
        model_save_path = f'{base_path}/location_prediction_model.pkl'
        scaler_features_save_path = f'{base_path}/location_prediction_scaler_features.pkl'
        scaler_targets_save_path = f'{base_path}/location_prediction_scaler_targets.pkl'

        # Load the model
        with open(model_save_path, 'rb') as f:
            self.model = pickle.load(f)

        # Load the scalers
        with open(scaler_features_save_path, 'rb') as f:
            self.scaler_features = pickle.load(f)

        with open(scaler_targets_save_path, 'rb') as f:
            self.scaler_targets = pickle.load(f)
        
        print("Model and scalers loaded successfully")

    def process_and_train(self, raw_df):
        """Process data and train the model without evaluation."""
        # Add time features
        df = self.add_time_features(raw_df)
        
        # Prepare data
        X, y = self.prepare_data_for_lstm(df)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Build and train model
        self.build_lstm_model()
        history = self.train_model(X_train, y_train)
        
        return X_test, y_test, history

def main():
    # Generate raw data
    raw_df = generate_synthetic_data()
    
    # Create model and process data
    bishop_model = BishopModel(sequence_length=144)  # 24 hours of data (144 * 10 minutes)
    X_test, y_test, history = bishop_model.process_and_train(raw_df)
    
    # Evaluate model separately
    predictions, actual = bishop_model.evaluate_model(X_test, y_test)
    
    # Save model and scalers
    bishop_model.save_model()

if __name__ == "__main__":
    main()