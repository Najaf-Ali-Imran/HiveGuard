# Use the official Python 3.9 image as the base image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file to the working directory
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that the FastAPI app will run on
EXPOSE 7860

# Command to run the FastAPI app using Uvicorn
# Hugging Face Spaces Docker SDK exposes port 7860 by default
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
