/**
 * PerformanceMonitorUI Component
 * Visual display of performance metrics and alerts
 */

import React, { useState, useEffect } from 'react';
import { performanceMonitor, PerformanceMetrics, PerformanceAlert } from '../../utils/PerformanceMonitor';
import './PerformanceMonitorUI.css';

interface PerformanceMonitorUIProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export const PerformanceMonitorUI: React.FC<PerformanceMonitorUIProps> = ({
  visible = true,
  position = 'top-right',
  compact = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    performanceMonitor.start();

    const unsubscribeMetrics = performanceMonitor.onMetricsUpdate((m) => {
      setMetrics(m);
    });

    const unsubscribeAlerts = performanceMonitor.onAlert((alert) => {
      setAlerts((prev) => [...prev.slice(-9), alert]);
    });

    return () => {
      performanceMonitor.stop();
    };
  }, []);

  if (!visible || !metrics) {
    return null;
  }

  const getMetricColor = (metric: string, value: number) => {
    if (metric === 'fps') {
      if (value < 30) return '#ff4444';
      if (value < 60) return '#ffaa00';
      return '#44ff44';
    }
    if (metric === 'latency') {
      if (value > 500) return '#ff4444';
      if (value > 200) return '#ffaa00';
      return '#44ff44';
    }
    if (metric === 'memory') {
      if (value > 0.9) return '#ff4444';
      if (value > 0.75) return '#ffaa00';
      return '#44ff44';
    }
    return '#6b9fff';
  };

  return (
    <div className={`performance-monitor ${position} ${isExpanded ? 'expanded' : 'compact'}`}>
      <div className="monitor-header">
        <span className="monitor-title">Performance</span>
        <button
          className="monitor-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="monitor-content">
          {/* FPS */}
          <div className="metric-row">
            <span className="metric-label">FPS</span>
            <span
              className="metric-value"
              style={{ color: getMetricColor('fps', metrics.fps) }}
            >
              {metrics.fps}
            </span>
          </div>

          {/* Frame Time */}
          <div className="metric-row">
            <span className="metric-label">Frame</span>
            <span className="metric-value">{metrics.frameTime.toFixed(1)}ms</span>
          </div>

          {/* Memory */}
          {metrics.memory && (
            <div className="metric-row">
              <span className="metric-label">Memory</span>
              <span
                className="metric-value"
                style={{ color: getMetricColor('memory', metrics.memory.percentage) }}
              >
                {metrics.memory.used}/{metrics.memory.limit}MB
              </span>
            </div>
          )}

          {/* Latency */}
          <div className="metric-row">
            <span className="metric-label">Ping</span>
            <span
              className="metric-value"
              style={{ color: getMetricColor('latency', metrics.network.latency) }}
            >
              {metrics.network.latency}ms
            </span>
          </div>

          {/* Errors */}
          {metrics.errors.count > 0 && (
            <div className="metric-row error">
              <span className="metric-label">Errors</span>
              <span className="metric-value">{metrics.errors.count}</span>
            </div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="alerts-section">
              <div className="alerts-title">Recent Alerts</div>
              <div className="alerts-list">
                {alerts.slice(-3).map((alert, idx) => (
                  <div key={idx} className={`alert alert-${alert.severity}`}>
                    <span className="alert-type">{alert.type}</span>
                    <span className="alert-message">{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitorUI;
