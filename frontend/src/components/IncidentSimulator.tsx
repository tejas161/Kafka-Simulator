import { useState, useCallback } from 'react';
import type { IncidentTemplate, PublishRequest } from '../types';
import { publishEvent } from '../hooks/useApi';

const INCIDENT_TEMPLATES: IncidentTemplate[] = [
  {
    id: 'critical-cpu',
    label: 'Critical CPU Alert',
    icon: 'cpu',
    severity: 'critical',
    payload: {
      event_type: 'infrastructure.alert',
      severity: 'critical',
      service: 'payment-api',
      environment: 'production',
      message: 'CPU utilization exceeded 90%',
    },
  },
  {
    id: 'high-memory',
    label: 'High Memory Alert',
    icon: 'mem',
    severity: 'high',
    payload: {
      event_type: 'infrastructure.alert',
      severity: 'high',
      service: 'order-service',
      environment: 'production',
      message: 'Memory utilization exceeded threshold',
    },
  },
  {
    id: 'service-unavailable',
    label: 'Service Unavailable',
    icon: 'svc',
    severity: 'critical',
    payload: {
      event_type: 'infrastructure.alert',
      severity: 'critical',
      service: 'user-service',
      environment: 'production',
      message: 'Service health check failed',
    },
  },
  {
    id: 'deployment-failed',
    label: 'Deployment Failed',
    icon: 'dep',
    severity: 'critical',
    payload: {
      event_type: 'deployment.failed',
      severity: 'critical',
      service: 'payment-api',
      environment: 'production',
      message: 'Deployment failed during rollout',
    },
  },
  {
    id: 'disk-space',
    label: 'Disk Space Alert',
    icon: 'dsk',
    severity: 'warning',
    payload: {
      event_type: 'infrastructure.alert',
      severity: 'warning',
      service: 'database',
      environment: 'production',
      message: 'Disk utilization exceeded 80%',
    },
  },
  {
    id: 'service-recovered',
    label: 'Service Recovered',
    icon: 'ok',
    severity: 'info',
    payload: {
      event_type: 'infrastructure.recovered',
      severity: 'info',
      service: 'payment-api',
      environment: 'production',
      message: 'Service recovered successfully',
    },
  },
];

interface IncidentSimulatorProps {
  kafkaConnected: boolean;
}

export const IncidentSimulator = ({ kafkaConnected }: IncidentSimulatorProps) => {
  const [service, setService] = useState('payment-api');
  const [environment, setEnvironment] = useState('production');
  const [sending, setSending] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleServiceChange = useCallback((value: string) => {
    setService(value);
  }, []);

  const handleEnvironmentChange = useCallback((value: string) => {
    setEnvironment(value);
  }, []);

  const handlePublish = useCallback(
    async (template: IncidentTemplate) => {
      if (!kafkaConnected) return;

      setSending(template.id);
      setLastError(null);

      const request: PublishRequest = {
        key: service,
        payload: {
          event_type: template.payload.event_type,
          severity: template.payload.severity,
          message: template.payload.message,
          service,
          environment,
          source: 'incident-simulator',
          timestamp: new Date().toISOString(),
          incident_id: '',
        },
      };

      try {
        await publishEvent(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to publish';
        setLastError(message);
      } finally {
        setSending(null);
      }
    },
    [service, environment, kafkaConnected]
  );

  return (
    <div className="panel" id="simulator">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Playbooks</p>
          <h3>Fire an incident</h3>
        </div>
      </div>
      <div className="panel-body">
        <div className="simulator-config">
          <div className="field">
            <label htmlFor="service-select">Service</label>
            <select
              id="service-select"
              value={service}
              onChange={(e) => handleServiceChange(e.target.value)}
              aria-label="Select service"
            >
              <option value="payment-api">payment-api</option>
              <option value="order-service">order-service</option>
              <option value="user-service">user-service</option>
              <option value="auth-service">auth-service</option>
              <option value="notification-service">notification-service</option>
              <option value="database">database</option>
              <option value="api-gateway">api-gateway</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="env-select">Environment</label>
            <select
              id="env-select"
              value={environment}
              onChange={(e) => handleEnvironmentChange(e.target.value)}
              aria-label="Select environment"
            >
              <option value="production">production</option>
              <option value="staging">staging</option>
              <option value="development">development</option>
            </select>
          </div>
        </div>

        <div className="incident-buttons">
          {INCIDENT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              className={`incident-btn severity-${template.severity}`}
              onClick={() => handlePublish(template)}
              disabled={!kafkaConnected || sending !== null}
              aria-label={`Trigger ${template.label}`}
              tabIndex={0}
            >
              <span className={`sev-mark severity-${template.severity}`} aria-hidden="true" />
              <span className="incident-label">{template.label}</span>
              {sending === template.id && <span className="spinner" />}
            </button>
          ))}
        </div>

        {lastError && (
          <div className="error-banner" role="alert">
            {lastError}
          </div>
        )}

        {!kafkaConnected && (
          <div className="warning-banner" role="status">
            Kafka is disconnected. Events cannot be published.
          </div>
        )}
      </div>
    </div>
  );
};
