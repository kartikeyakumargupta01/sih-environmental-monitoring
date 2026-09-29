# Resilient AI-Powered Environmental Monitoring Network

Smart India Hackathon environmental monitoring prototype for real-time flood, fire, and air-quality monitoring using ESP32 sensor nodes, LoRa communication, FastAPI, PostgreSQL, and a web dashboard.

## Project Code

**SIH 26078**

## Overview

This project implements a distributed environmental monitoring system designed to collect sensor data from remote locations, transmit it over LoRa, process it through a backend API, store historical readings, calculate environmental risk levels, and display the results through a live dashboard.

The current prototype uses one environmental sensing node:

- `NODE-F01`

The same node supplies data for:

- Flood monitoring
- Fire monitoring
- Air-quality monitoring

The system does not generate fake flood, fire, or air nodes.

---

## System Architecture

```text
HC-SR04 Water Sensor
Rain Sensor
DHT11 Temperature/Humidity
MQ-2 Gas/Smoke Sensor
        |
        v
Transmitter ESP32
        |
        | LoRa 433 MHz
        v
Receiver ESP32
        |
        | Wi-Fi / HTTP
        v
FastAPI Backend
        |
        v
PostgreSQL Database
        |
        v
Risk Evaluation Engine
        |
        +-------------------+
        |                   |
        v                   v
Web Dashboard          Email Alerts
```
