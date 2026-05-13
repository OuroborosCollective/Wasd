/**
 * SSH Connection Validation Test Script
 * 
 * Tests SSH connectivity to VPS without blocking build processes.
 * Use for validating SSH tunnel before GitOps deployment.
 * 
 * Usage:
 *   npx tsx scripts/ssh-connectivity-test.ts
 *   # Or compile and run:
 *   tsc scripts/ssh-connectivity-test.ts && node scripts/ssh-connectivity-test.js
 */

import { Client } from 'ssh2';
import readline from 'readline';

/**
 * Configuration for SSH connection
 */
interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

/**
 * Test result
 */
interface TestResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
  serverInfo?: {
    platform: string;
    nodeVersion: string;
    uptime?: string;
  };
}

/**
 * Default configuration from environment
 */
const DEFAULT_CONFIG: SSHConfig = {
  host: process.env.VPS_HOST || 'your-vps-ip',
  port: parseInt(process.env.VPS_PORT || '22'),
  username: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD,
  privateKey: process.env.SSH_PRIVATE_KEY_PATH || process.env.HOME + '/.ssh/id_rsa',
};

/**
 * Parse fingerprint from known_hosts line
 */
function parseKnownHosts(fingerprint: string): string {
  // Extract just the key part
  const parts = fingerprint.split(' ');
  return parts[0];
}

/**
 * Test SSH connectivity
 */
async function testSSHConnection(config: SSHConfig): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const conn = new Client();
    
    const timeout = setTimeout(() => {
      conn.end();
      resolve({
        success: false,
        error: 'Connection timeout after 30s'
      });
    }, 30000);
    
    conn.on('ready', () => {
      const latencyMs = Date.now() - startTime;
      console.log(`✓ SSH connection established (${latencyMs}ms)`);
      
      // Get server info
      conn.exec('uname -a && node --version && uptime', (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          resolve({
            success: true,
            latencyMs,
            error: err.message
          });
          return;
        }
        
        let output = '';
        stream.on('data', (data: Buffer) => {
          output += data.toString();
        }).on('close', () => {
          clearTimeout(timeout);
          conn.end();
          
          const lines = output.trim().split('\n');
          resolve({
            success: true,
            latencyMs,
            serverInfo: {
              platform: lines[0] || 'unknown',
              nodeVersion: lines[1] || 'unknown',
              uptime: lines[2] || 'unknown'
            }
          });
        });
      });
    });
    
    conn.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: err.message
      });
    });
    
    // Connect with password or key
    if (config.password) {
      conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 30000,
        strictVendor: false
      });
    } else if (config.privateKey) {
      // Try to read private key from file
      import('fs').then(fs => {
        if (fs.existsSync(config.privateKey!)) {
          const privateKey = fs.readFileSync(config.privateKey!);
          conn.connect({
            host: config.host,
            port: config.port,
            username: config.username,
            privateKey,
            passphrase: config.passphrase,
            readyTimeout: 30000,
            strictVendor: false
          });
        } else {
          conn.end();
          resolve({
            success: false,
            error: `Private key not found: ${config.privateKey}`
          });
        }
      }).catch(() => {
        conn.end();
        resolve({
          success: false,
          error: 'Failed to read private key'
        });
      });
    } else {
      conn.end();
      resolve({
        success: false,
        error: 'No authentication method provided'
      });
    }
  });
}

/**
 * Interactive prompt
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Main test function
 */
async function main() {
  console.log('═══ SSH Connectivity Test ═══\n');
  
  // Load configuration
  let config = { ...DEFAULT_CONFIG };
  
  // Check for required credentials
  if (!config.host || config.host === 'your-vps-ip') {
    console.log('⚠ VPS_HOST not set, using interactive mode');
    config.host = await prompt('VPS Host/IP: ');
    config.username = await prompt('Username [root]: ') || 'root';
    
    const password = await prompt('Password (optional, press Enter for key): ');
    if (password) {
      config.password = password;
    } else {
      const keyPath = await prompt('Private key path [~/.ssh/id_rsa]: ');
      if (keyPath) {
        config.privateKey = keyPath;
      }
    }
  }
  
  console.log(`\nConnecting to ${config.username}@${config.host}:${config.port}...`);
  
  // Run test
  const result = await testSSHConnection(config);
  
  console.log('\n═══ Results ═══');
  
  if (result.success) {
    console.log('✓ SSH Connection: SUCCESS');
    if (result.latencyMs) {
      console.log(`  Latency: ${result.latencyMs}ms`);
    }
    if (result.serverInfo) {
      console.log(`  Platform: ${result.serverInfo.platform}`);
      console.log(`  Node.js: ${result.serverInfo.nodeVersion}`);
      console.log(`  Uptime: ${result.serverInfo.uptime}`);
    }
  } else {
    console.log('✗ SSH Connection: FAILED');
    console.log(`  Error: ${result.error}`);
    process.exit(1);
  }
  
  console.log('\n✓ Test completed successfully');
}

// Run if executed directly
main().catch(console.error);

export { testSSHConnection, SSHConfig, TestResult };
export default main;