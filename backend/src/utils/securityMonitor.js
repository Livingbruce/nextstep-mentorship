import fs from 'fs';
import path from 'path';

class SecurityMonitor {
  constructor() {
    this.logFile = path.join(process.cwd(), 'logs', 'security.log');
    this.alertThresholds = {
      failedLogins: 5, // per hour
      rateLimitHits: 10, // per hour
      aiDetections: 3, // per hour
      suspiciousActivity: 2 // per hour
    };
    this.counters = {
      failedLogins: 0,
      rateLimitHits: 0,
      aiDetections: 0,
      suspiciousActivity: 0
    };
    
    // Reset counters every hour
    setInterval(() => {
      this.resetCounters();
    }, 60 * 60 * 1000);
  }

  log(event, details) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details,
      ip: details.ip || 'unknown'
    };

    // Write to log file
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');

    // Update counters
    this.updateCounters(event);

    // Check for alerts
    this.checkAlerts(event, details);
  }

  updateCounters(event) {
    switch (event) {
      case 'FAILED_LOGIN':
        this.counters.failedLogins++;
        break;
      case 'RATE_LIMIT_EXCEEDED':
        this.counters.rateLimitHits++;
        break;
      case 'AI_DETECTED':
        this.counters.aiDetections++;
        break;
      case 'SUSPICIOUS_ACTIVITY':
        this.counters.suspiciousActivity++;
        break;
    }
  }

  checkAlerts(event, details) {
    const alerts = [];

    if (this.counters.failedLogins >= this.alertThresholds.failedLogins) {
      alerts.push({
        type: 'HIGH',
        message: `High number of failed login attempts: ${this.counters.failedLogins}`,
        action: 'Consider blocking IP or implementing CAPTCHA'
      });
    }

    if (this.counters.rateLimitHits >= this.alertThresholds.rateLimitHits) {
      alerts.push({
        type: 'MEDIUM',
        message: `Rate limiting frequently triggered: ${this.counters.rateLimitHits}`,
        action: 'Review rate limiting configuration'
      });
    }

    if (this.counters.aiDetections >= this.alertThresholds.aiDetections) {
      alerts.push({
        type: 'HIGH',
        message: `AI/Spam detection triggered: ${this.counters.aiDetections}`,
        action: 'Review AI detection patterns and blocking rules'
      });
    }

    if (this.counters.suspiciousActivity >= this.alertThresholds.suspiciousActivity) {
      alerts.push({
        type: 'CRITICAL',
        message: `Suspicious activity detected: ${this.counters.suspiciousActivity}`,
        action: 'Immediate investigation required'
      });
    }

    // Send alerts
    alerts.forEach(alert => {
      console.warn(`🚨 SECURITY ALERT [${alert.type}]: ${alert.message}`);
      console.warn(`Action: ${alert.action}`);
      
      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        this.sendAlert(alert);
      }
    });
  }

  resetCounters() {
    this.counters = {
      failedLogins: 0,
      rateLimitHits: 0,
      aiDetections: 0,
      suspiciousActivity: 0
    };
  }

  sendAlert(alert) {
    // Implement alert sending (email, Slack, etc.)
    console.log('Alert would be sent:', alert);
  }

  getSecurityReport() {
    return {
      timestamp: new Date().toISOString(),
      counters: this.counters,
      thresholds: this.alertThresholds,
      status: this.getOverallStatus()
    };
  }

  getOverallStatus() {
    const criticalAlerts = Object.values(this.counters).some(
      count => count >= this.alertThresholds.suspiciousActivity
    );
    
    if (criticalAlerts) return 'CRITICAL';
    
    const highAlerts = Object.values(this.counters).some(
      count => count >= this.alertThresholds.failedLogins
    );
    
    if (highAlerts) return 'HIGH';
    
    return 'NORMAL';
  }
}

export default new SecurityMonitor();
