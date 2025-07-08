#!/bin/bash

while true; do
    node server.js
    echo "Server stopped. Press Ctrl+C to exit or wait 1 second to restart..."
    sleep 1
done 