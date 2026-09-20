# Kafka Incident Simulator

A polished, full-stack developer tool that simulates a real-world infrastructure monitoring system using Apache Kafka. Publish realistic incident events into Kafka and observe remediation events coming back in real time.

```
Kafka Incident Simulator ──→ Kafka ──→ Automation Orchestrator
                                              │
Kafka Incident Simulator ←── Kafka ←──────────┘
```

## Quick Start

```bash
# 1. Start Kafka with Podman (see "Running Kafka Locally" below for details)
podman run -d --name kafka-simulator -p 9092:9092 \
  -e KAFKA_NODE_ID=1 -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
  docker.io/apache/kafka:4.3.1

# 2. Wait ~10s, then create topics
podman exec kafka-simulator /opt/kafka/bin/kafka-topics.sh --create --topic infrastructure-alerts --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
podman exec kafka-simulator /opt/kafka/bin/kafka-topics.sh --create --topic remediation-events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
podman exec kafka-simulator /opt/kafka/bin/kafka-topics.sh --create --topic dead-letter --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

# 3. Install dependencies & start the app
npm run install:all
cp .env.example backend/.env
npm run dev
```

Open **http://localhost:5173** — the dashboard should show **● Kafka Connected**.

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Podman** (or Docker) for running Kafka locally
- **Apache Kafka** running on `localhost:9092`

### Running Kafka Locally (Podman)

This project uses the official `apache/kafka` image with KRaft mode (no Zookeeper required).

#### Step 1 — Pull the image (if not already present)

```bash
podman pull docker.io/apache/kafka:4.3.1
```

#### Step 2 — Start Kafka

```bash
podman run -d --name kafka-simulator \
  -p 9092:9092 \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
  docker.io/apache/kafka:4.3.1
```

#### Step 3 — Wait for Kafka to be ready (~10 seconds)

```bash
# Check the container is running
podman ps --filter name=kafka-simulator

# Optionally check logs until you see "Kafka Server started"
podman logs -f kafka-simulator
```

#### Step 4 — Create the required topics

```bash
podman exec kafka-simulator /opt/kafka/bin/kafka-topics.sh \
  --create --topic infrastructure-alerts \
  --bootstrap-server localhost:9092 \
  --partitions 3 --replication-factor 1

podman exec kafka-simulator /opt/kafka/bin/kafka-topics.sh \
  --create --topic remediation-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 --replication-factor 1

podman exec kafka-simulator /opt/kafka/bin/kafka-topics.sh \
  --create --topic dead-letter \
  --bootstrap-server localhost:9092 \
  --partitions 1 --replication-factor 1
```

#### Step 5 — Verify topics

```bash
podman exec kafka-simulator /opt/kafka/bin/kafka-topics.sh \
  --list --bootstrap-server localhost:9092
```

Expected output:

```
dead-letter
infrastructure-alerts
remediation-events
```

#### Stopping & restarting Kafka

```bash
# Stop the container
podman stop kafka-simulator

# Start again (data persists while container exists)
podman start kafka-simulator

# Force kill and remove (use this before recreating with new settings)
podman rm -f kafka-simulator

# Check if the container is running
podman ps --filter name=kafka-simulator

# Check if the container exists (stopped or running)
podman ps -a --filter name=kafka-simulator
```

## Installation

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all
```

## Configuration

Copy the example environment file and adjust as needed:

```bash
cp .env.example backend/.env
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `kafka-incident-simulator` | Kafka client identifier |
| `KAFKA_ALERT_TOPIC` | `infrastructure-alerts` | Topic for publishing alerts |
| `KAFKA_REMEDIATION_TOPIC` | `remediation-events` | Topic for consuming remediation events |
| `KAFKA_DLQ_TOPIC` | `dead-letter` | Dead-letter queue topic |
| `KAFKA_CONSUMER_GROUP` | `kafka-incident-simulator-group` | Consumer group ID |
| `KAFKA_CONSUME_DLQ` | `false` | Also consume from dead-letter topic |
| `PORT` | `3001` | Backend server port |

## Running

```bash
# Start both backend and frontend
npm run dev
```

This starts:
- **Backend** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`

The frontend proxies API requests to the backend automatically.

## Demo Flow

1. **Open the UI** at `http://localhost:5173`
2. Verify **Kafka Connected** status in the header
3. **Click an incident button** (e.g., "Critical CPU Alert")
4. The event is published to `infrastructure-alerts` → appears in the activity feed
5. **Automation Orchestrator** (external) consumes the event and runs a workflow
6. The Orchestrator publishes a result to `remediation-events`
7. The simulator **receives the remediation event** in real time

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/events/publish` | Publish a Kafka event |
| `GET` | `/api/events/stream` | SSE stream for real-time events |
| `GET` | `/api/events/history` | Get event history and stats |
| `POST` | `/api/events/reset` | Reset event history and stats |
| `GET` | `/api/health/kafka` | Kafka connection health check |
| `GET` | `/api/health/` | General health check |

## Project Structure

```
kafka-incident-simulator/
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/         # Dashboard, Simulator, Activity feed
│   │   ├── hooks/              # SSE stream, API hooks
│   │   └── types/              # Shared TypeScript types
│   └── package.json
├── backend/                    # Express + KafkaJS + TypeScript
│   ├── src/
│   │   ├── kafka/              # Client, Producer, Consumer
│   │   ├── routes/             # REST API + SSE endpoints
│   │   ├── services/           # Event bus and broadcasting
│   │   └── types/              # Backend types
│   └── package.json
├── .env.example
├── package.json                # Root scripts (concurrently)
└── README.md
```

## Architecture

The simulator is intentionally decoupled from the Automation Orchestrator. It communicates **only through Kafka**:

```
┌───────────────────────┐
│  React Dashboard      │
│  (Vite + TypeScript)  │
└───────┬───────────────┘
        │ REST + SSE
┌───────▼───────────────┐
│  Express Backend      │
│  KafkaJS Producer     │──→  infrastructure-alerts
│  KafkaJS Consumer     │←──  remediation-events
└───────────────────────┘
```
