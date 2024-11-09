#!/bin/bash
echo "Current directory: $(pwd)"
echo "Listing current directory:"
ls -la

echo "\nChanging to yesm-front directory..."
cd yesm-front
echo "Current directory: $(pwd)"
echo "Listing yesm-front directory:"
ls -la

echo "\nInstalling frontend dependencies..."
npm install

echo "\nBuilding frontend..."
npm run build

echo "\nChecking build directory..."
ls -la build || echo "Build directory not created"

echo "\nChanging back to root directory..."
cd ..

echo "\nInstalling backend dependencies..."
cd yesm-back
npm install