#!/usr/bin/env pwsh
# Quick Start Script for Webhook Tutorial

Write-Host "🔔 Webhook Tutorial - Quick Start" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install from https://nodejs.org" -ForegroundColor Red
    exit
}

# Check if MongoDB is installed/running
Write-Host ""
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
$mongoRunning = $false
try {
    # Try to connect to MongoDB
    $output = mongosh --eval "db.adminCommand('ping')" --quiet 2>&1
    if ($output -match "ok") {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
        $mongoRunning = $true
    }
} catch {
    Write-Host "⚠️  MongoDB might not be running" -ForegroundColor Yellow
}

if (!$mongoRunning) {
    Write-Host ""
    Write-Host "To start MongoDB on Windows:" -ForegroundColor Cyan
    Write-Host "  Option 1: net start MongoDB" -ForegroundColor Gray
    Write-Host "  Option 2: mongod (if not installed as service)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For help, visit: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/" -ForegroundColor Gray
    Write-Host ""
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Create .env if doesn't exist
if (!(Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env created" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the backend:  npm run dev" -ForegroundColor Gray
Write-Host "2. Start the frontend: python -m http.server 3000" -ForegroundColor Gray
Write-Host "3. Open:               http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "Start backend now? (y/n)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "🚀 Starting backend server..." -ForegroundColor Green
    Write-Host ""
    npm run dev
}
