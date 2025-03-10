#!/bin/bash

# Build the project
echo "Building the project..."
npm run build

# Start the server with the --run-monitoring and --exit-after-monitoring flags
echo "Running monitoring once and exiting..."
node build/index.js --run-monitoring --exit-after-monitoring
