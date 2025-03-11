
import numpy as np
import pandas as pd
from faker import Faker
from datetime import datetime, timedelta
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler

# Generate synthetic data
fake = Faker()
num_samples = 15000  # 100 days of data, collected every 10 minutes

base_lat, base_lon = 40.0190, 105.2747  # New York City coordinates
start_date = fake.date_time_between(start_date='-100d', end_date='-99d')
timestamps = [start_date + timedelta(minutes=10*i) for i in range(num_samples)]
latitudes = [base_lat + np.random.normal(0, 0.01) for _ in range(num_samples)]
longitudes = [base_lon + np.random.normal(0, 0.01) for _ in range(num_samples)]

df = pd.DataFrame({
    'timestamp': timestamps,
    'latitude': latitudes,
    'longitude': longitudes
})

# Add time-based features
df['minute_of_day'] = df['timestamp'].dt.hour * 60 + df['timestamp'].dt.minute
df['day_of_week'] = df['timestamp'].dt.dayofweek

df

# Prepare data for LSTM
scaler_features = MinMaxScaler()
scaler_targets = MinMaxScaler()

scaled_features = scaler_features.fit_transform(df[['latitude', 'longitude', 'minute_of_day', 'day_of_week']])
scaled_targets = scaler_targets.fit_transform(df[['latitude', 'longitude']])

sequence_length = 144  # 24 hours of data (144 * 10 minutes)
X, y = [], []
for i in range(len(scaled_features) - sequence_length):
    X.append(scaled_features[i:i+sequence_length])
    y.append(scaled_targets[i+sequence_length])

X = np.array(X)
y = np.array(y)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Define model architecture
model = tf.keras.Sequential([
    tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(128, return_sequences=True), input_shape=(sequence_length, 4)),
    tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64, return_sequences=True)),
    tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32)),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(2)
])

# Compile model
model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss='mse', metrics=['mae'])

# Train model with early stopping and learning rate reduction
early_stopping = tf.keras.callbacks.EarlyStopping(patience=20, restore_best_weights=True)
reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(factor=0.2, patience=5, min_lr=1e-6)

history = model.fit(
    X_train, y_train,
    epochs=200,
    batch_size=32,
    validation_split=0.2,
    callbacks=[early_stopping, reduce_lr],
    verbose=1
)

# Evaluate model
test_loss, test_mae = model.evaluate(X_test, y_test)
print(f"Test MAE (scaled): {test_mae}")

# Make predictions
predictions = model.predict(X_test)
predictions = scaler_targets.inverse_transform(predictions)
actual = scaler_targets.inverse_transform(y_test)

# Calculate accuracy
mae = np.mean(np.abs(predictions - actual))
rmse = np.sqrt(np.mean((predictions - actual)**2))
print(f"Mean Absolute Error (degrees): {mae}")
print(f"Root Mean Square Error (degrees): {rmse}")

# Calculate error in kilometers
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth's radius in kilometers

    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

    return R * c

errors_km = haversine_distance(actual[:, 0], actual[:, 1], predictions[:, 0], predictions[:, 1])
mae_km = np.mean(errors_km)
rmse_km = np.sqrt(np.mean(errors_km**2))

print(f"Mean Absolute Error (km): {mae_km}")
print(f"Root Mean Square Error (km): {rmse_km}")

from google.colab import drive
drive.mount('/content/drive')
import pickle
# Specify the file path within your Google Drive
model_save_path = '/content/drive/MyDrive/bdarch/location_prediction_model.pkl'
scaler_features_save_path = '/content/drive/MyDrive/bdarch/location_prediction_scaler_features.pkl'
scaler_targets_save_path = '/content/drive/MyDrive/bdarch/location_prediction_scaler_targets.pkl'

# Save the model
with open(model_save_path, 'wb') as f:
    pickle.dump(model, f)

# Save the scalers
with open(scaler_features_save_path, 'wb') as f:
    pickle.dump(scaler_features, f)

with open(scaler_targets_save_path, 'wb') as f:
    pickle.dump(scaler_targets, f)

from google.colab import drive
drive.mount('/content/drive', force_remount=True)
import pickle
# Specify the file path within your Google Drive
model_save_path = '/content/drive/MyDrive/DevWorld/bdarch/location_prediction_model.pkl'
scaler_features_save_path = '/content/drive/MyDrive/DevWorld/bdarch/location_prediction_scaler_features.pkl'
scaler_targets_save_path = '/content/drive/MyDrive/DevWorld/bdarch/location_prediction_scaler_targets.pkl'

# Save the model
with open(model_save_path, 'wb') as f:
    pickle.dump(model, f)

# Save the scalers
with open(scaler_features_save_path, 'wb') as f:
    pickle.dump(scaler_features, f)

with open(scaler_targets_save_path, 'wb') as f:
    pickle.dump(scaler_targets, f)

print("All 3 uploaded")

