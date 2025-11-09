#!/bin/bash
set -e

# Install backend dependencies
cd backend
npm install

# Install function dependencies
cd netlify/functions
npm install

# Install frontend dependencies and build
cd ../../../frontend
npm install
npm run build

