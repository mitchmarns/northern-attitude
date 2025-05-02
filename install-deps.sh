#!/bin/bash

# Make script executable
chmod +x install-deps.sh

# Install dependencies
echo "Installing dependencies..."
npm install

# Verify express-validator is installed
if [ -d "./node_modules/express-validator" ]; then
  echo "✅ express-validator successfully installed"
else
  echo "⚠️ express-validator installation failed, attempting direct install..."
  npm install express-validator
fi

echo "Dependency installation completed!"
echo "You can now run the application with: npm start"
