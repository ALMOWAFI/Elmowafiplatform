# Monitoring Stack for Elmowafy Platform

This directory contains the monitoring infrastructure for the Elmowafy platform, including metrics collection, log aggregation, and alerting.

## Components

- **Prometheus**: Time-series database for metrics collection
- **Grafana**: Visualization and dashboarding
- **Alertmanager**: Handles alerts from Prometheus
- **Loki**: Log aggregation system
- **Promtail**: Agent for shipping logs to Loki
- **Node Exporter**: System metrics collection
- **cAdvisor**: Container metrics collection

## Prerequisites

- Docker and Docker Compose
- At least 4GB of RAM available
- Ports 3000, 9090, 9093, 3100, 8080, 9080, 9100 available

## Quick Start

1. Clone the repository
2. Navigate to the monitoring directory:
   ```bash
   cd monitoring
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Edit the `.env` file with your configuration
5. Start the monitoring stack:
   ```bash
   docker-compose up -d
   ```

## Accessing the Services

- **Grafana**: http://localhost:3000
  - Default credentials: admin/admin (change on first login)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **cAdvisor**: http://localhost:8080
- **Node Exporter**: http://localhost:9100/metrics
- **Loki**: http://localhost:3100

## Setting Up Grafana

1. Log in to Grafana (default: admin/admin)
2. Add data sources:
   - Prometheus: http://prometheus:9090
   - Loki: http://loki:3100
3. Import dashboards from the `grafana/dashboards` directory

## Alerting

Alerts are configured in `prometheus/alert.rules` and managed by Alertmanager. To receive alerts:

1. Update the `alertmanager/config.yml` with your email/SMS settings
2. Configure notification channels in Alertmanager
3. Test alerts using the Alertmanager UI

## Adding Application Metrics

To add custom metrics to your application:

1. For Node.js (Frontend/Backend):
   ```javascript
   const promClient = require('prom-client');
   
   // Create a counter
   const counter = new promClient.Counter({
     name: 'http_requests_total',
     help: 'Total number of HTTP requests',
     labelNames: ['method', 'route', 'status_code']
   });
   
   // Increment counter in your route handler
   app.get('/api/endpoint', (req, res) => {
     counter.inc({ method: 'GET', route: '/api/endpoint', status_code: '200' });
     res.json({ status: 'ok' });
   });
   
   // Expose metrics endpoint
   app.get('/metrics', async (req, res) => {
     res.set('Content-Type', promClient.register.contentType);
     res.end(await promClient.register.metrics());
   });
   ```

2. For Python (FastAPI):
   ```python
   from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
   
   # Create a counter
   REQUEST_COUNTER = Counter(
       'http_requests_total',
       'Total number of HTTP requests',
       ['method', 'endpoint', 'status_code']
   )
   
   # Use in your route
   @app.get("/api/endpoint")
   async def example_endpoint():
       REQUEST_COUNTER.labels(method='GET', endpoint='/api/endpoint', status_code='200').inc()
       return {"status": "ok"}
   
   # Expose metrics endpoint
   @app.get("/metrics")
   async def metrics():
       return Response(
           generate_latest(),
           media_type=CONTENT_TYPE_LATEST
       )
   ```

## Logging Best Practices

1. Use structured logging:
   ```json
   {
     "timestamp": "2023-01-01T12:00:00Z",
     "level": "INFO",
     "service": "auth-service",
     "message": "User logged in",
     "user_id": "12345",
     "ip": "192.168.1.1"
   }
   ```

2. Include correlation IDs in logs for tracing requests across services

3. Log levels:
   - ERROR: System is in distress, must be addressed ASAP
   - WARN: Not an error, but indicates something unexpected happened
   - INFO: Normal operational messages
   - DEBUG: Detailed information for debugging

## Maintenance

- Check disk usage of Prometheus and Loki volumes
- Regularly update the Docker images
- Review and update alert thresholds as needed
- Backup Grafana dashboards and Alertmanager configurations

## Troubleshooting

- Check container logs: `docker-compose logs -f <service>`
- Verify Prometheus targets: http://localhost:9090/targets
- Check Loki logs: http://localhost:3100/ready
- Verify Alertmanager configuration: http://localhost:9093/#/status
