#!/usr/bin/env node
/**
 * scripts/audit-event-flow.mjs
 * 
 * IMPORTANT: This is a STATIC HEURISTIC audit. It does not validate runtime behavior.
 * Events are verified by analyzing source code patterns, not by executing the server.
 * 
 * Modes:
 *   --baseline  Report findings without failing (for CI baseline)
 *   --strict    Fail on any findings (default behavior when not in baseline)
 *   --verbose   Show detailed output
 *   --json      Output machine-readable JSON
 *   --mermaid   Generate Mermaid diagram
 * 
 * Builds graph from:
 * - emit( patterns
 * - publish( patterns
 * - broadcast( patterns
 * - on( patterns
 * - subscribe( patterns
 * 
 * Event names support: word characters, hyphen, dot, slash, colon, underscore
 * 
 * Flags:
 * - Orphan events (emit > 0, consumer = 0)
 * - Dead subscriptions (subscribe but never emit)
 * - Unresolved event references (UNKNOWN events)
 * 
 * Output:
 * {
 *   "emitters": [...],
 *   "consumers": [...],
 *   "orphanEvents": [...],
 *   "deadSubscriptions": [...],
 *   "unresolvedEventReferences": [...],
 *   "eventGraph": {...}
 * }
 * 
 * Usage:
 *   node scripts/audit-event-flow.mjs [--verbose] [--mermaid]
 *   node scripts/audit-event-flow.mjs --baseline
 *   node scripts/audit-event-flow.mjs --strict
 * 
 * Exit codes:
 *   0 - Success (in baseline mode: findings reported, no failure)
 *   1 - Critical failure
 *   2 - Findings reported (strict mode only)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const ARGV = process.argv.slice(2);
const VERBOSE = ARGV.includes('--verbose') || ARGV.includes('-v');
const OUTPUT_JSON = ARGV.includes('--json');
const OUTPUT_MERMAID = ARGV.includes('--mermaid');
const BASELINE_MODE = ARGV.includes('--baseline');
const STRICT_MODE = ARGV.includes('--strict');

const results = {
  mode: BASELINE_MODE ? 'baseline' : (STRICT_MODE ? 'strict' : 'standard'),
  emitters: [],        // Files that emit events
  consumers: [],       // Files that subscribe to events
  orphanEvents: [],    // Events emitted but never consumed
  deadSubscriptions: [], // Subscriptions to non-existent events
  unresolvedEventReferences: [], // UNKNOWN events (parsing failures)
  eventGraph: {
    events: {},
    emitters: {},
    consumers: {}
  },
  warnings: []
};

/**
 * Find all TypeScript/JS files recursively
 */
function findTsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === '.git') continue;
      findTsFiles(full, files);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      if (entry.includes('.test.') || entry.includes('.spec.')) continue;
      files.push(full);
    }
  }
  return files;
}

/**
 * Extract event operations from content
 * 
 * Supports extended event name patterns: word chars, hyphen, dot, slash, colon
 */
function extractEventOperations(filePath, content) {
  const relativePath = relative(ROOT, filePath);
  const operations = {
    emits: [],
    publishes: [],
    broadcasts: [],
    subscribes: [],
    onHandlers: []
  };
  
  const lines = content.split('\n');
  
  // Extended event name pattern: supports word chars, hyphen, dot, slash, colon, underscore
  const EVENT_NAME_PATTERN = /["'`]([a-zA-Z_][a-zA-Z0-9_\-\.\/:]*)["'`]/;
  
  // Pattern for emit( or .emit(
  const emitPattern = /\.emit\s*\(|emit\s*\(/g;
  const publishPattern = /\.publish\s*\(|publish\s*\(/g;
  const broadcastPattern = /\.broadcast\s*\(|broadcast\s*\(/g;
  const subscribePattern = /\.subscribe\s*\(|subscribe\s*\(/g;
  const onPattern = /\.on\s*\(|addEventListener\s*\(/g;
  
  // Extract emit events
  let match;
  emitPattern.lastIndex = 0;
  while ((match = emitPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNum - 1] || '';
    
    // Try to extract event name from various patterns
    // emit("event_name", ...) or emit({ type: "event_name", ... })
    const eventMatch = line.match(/emit\s*\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_\-\.\/:]*)["'`]/);
    const objMatch = line.match(/emit\s*\(\s*\{[^}]*type\s*:\s*["'`]([a-zA-Z_][a-zA-Z0-9_\-\.\/:]*)["'`]/);
    
    let eventName = null;
    if (eventMatch) {
      eventName = eventMatch[1];
    } else if (objMatch) {
      eventName = objMatch[1];
    }
    
    if (eventName) {
      operations.emits.push({
        file: relativePath,
        line: lineNum,
        event: eventName,
        snippet: line.trim().substring(0, 80)
      });
    } else {
      // UNKNOWN event - could not parse
      operations.emits.push({
        file: relativePath,
        line: lineNum,
        event: 'UNKNOWN',
        snippet: line.trim().substring(0, 80),
        unresolved: true
      });
    }
  }
  
  // Extract publish events
  publishPattern.lastIndex = 0;
  while ((match = publishPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNum - 1] || '';
    
    const eventMatch = line.match(/publish\s*\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_\-\.\/:]*)["'`]/);
    const objMatch = line.match(/publish\s*\(\s*\{[^}]*type\s*:\s*["'`]([a-zA-Z_][a-zA-Z0-9_\-\.\/:]*)["'`]/);
    
    let eventName = null;
    if (eventMatch) {
      eventName = eventMatch[1];
    } else if (objMatch) {
      eventName = objMatch[1];
    }
    
    if (eventName) {
      operations.publishes.push({
        file: relativePath,
        line: lineNum,
        event: eventName,
        snippet: line.trim().substring(0, 80)
      });
    }
  }
  
  // Extract broadcast events
  broadcastPattern.lastIndex = 0;
  while ((match = broadcastPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNum - 1] || '';
    
    const eventMatch = line.match(/broadcast\s*\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_\-\.\/:]*)["'`]/);
    
    let eventName = null;
    if (eventMatch) {
      eventName = eventMatch[1];
    }
    
    if (eventName) {
      operations.broadcasts.push({
        file: relativePath,
        line: lineNum,
        event: eventName,
        snippet: line.trim().substring(0, 80)
      });
    }
  }
  
  // Extract subscribe handlers
  subscribePattern.lastIndex = 0;
  while ((match = subscribePattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNum - 1] || '';
    
    const eventMatch = line.match(/subscribe\s*\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_\-\.\/:]*)["'`]/);
    
    let eventName = null;
    if (eventMatch) {
      eventName = eventMatch[1];
    }
    
    if (eventName) {
      operations.subscribes.push({
        file: relativePath,
        line: lineNum,
        event: eventName,
        snippet: line.trim().substring(0, 80)
      });
    }
  }
  
  // Extract on handlers
  onPattern.lastIndex = 0;
  while ((match = onPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNum - 1] || '';
    
    // Check if it's a WorldEventBus or similar event bus
    const contextBefore = content.substring(Math.max(0, match.index - 100), match.index);
    if (!contextBefore.includes('EventBus') && !contextBefore.includes('eventBus') && 
        !contextBefore.includes('bus.') && !contextBefore.includes('Bus')) {
      continue; // Skip non-event bus .on() calls (like DOM events)
    }
    
    const eventMatch = line.match(/\.on\s*\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_\-\.\/:]*)["'`]/);
    
    let eventName = null;
    if (eventMatch) {
      eventName = eventMatch[1];
    }
    
    if (eventName) {
      operations.onHandlers.push({
        file: relativePath,
        line: lineNum,
        event: eventName,
        snippet: line.trim().substring(0, 80)
      });
    }
  }
  
  return operations;
}

/**
 * Build event graph
 */
function buildEventGraph(allOperations) {
  const graph = {
    events: {},
    emitters: {},
    consumers: {}
  };
  
  // Process all emit operations
  for (const ops of allOperations) {
    const allEmits = [...ops.emits, ...ops.publishes, ...ops.broadcasts];
    
    for (const emit of allEmits) {
      if (!graph.events[emit.event]) {
        graph.events[emit.event] = { emitCount: 0, consumers: new Set() };
      }
      graph.events[emit.event].emitCount++;
      
      if (!graph.emitters[emit.file]) {
        graph.emitters[emit.file] = new Set();
      }
      graph.emitters[emit.file].add(emit.event);
    }
    
    // Process all subscribe operations
    const allSubs = [...ops.subscribes, ...ops.onHandlers];
    
    for (const sub of allSubs) {
      if (!graph.events[sub.event]) {
        graph.events[sub.event] = { emitCount: 0, consumers: new Set() };
      }
      graph.events[sub.event].consumers.add(sub.file);
      
      if (!graph.consumers[sub.file]) {
        graph.consumers[sub.file] = new Set();
      }
      graph.consumers[sub.file].add(sub.event);
    }
  }
  
  // Convert sets to arrays for JSON serialization
  const serialized = {
    events: {},
    emitters: {},
    consumers: {}
  };
  
  for (const [event, data] of Object.entries(graph.events)) {
    serialized.events[event] = {
      emitCount: data.emitCount,
      consumerCount: data.consumers.size,
      consumerFiles: [...data.consumers]
    };
  }
  
  for (const [file, events] of Object.entries(graph.emitters)) {
    serialized.emitters[file] = [...events];
  }
  
  for (const [file, events] of Object.entries(graph.consumers)) {
    serialized.consumers[file] = [...events];
  }
  
  return serialized;
}

/**
 * Main audit function
 */
async function runAudit() {
  console.log('🔍 ARE Event Flow Audit');
  console.log('='.repeat(50));
  console.log(`Mode: ${results.mode.toUpperCase()}`);
  console.log('⚠️  This is a STATIC HEURISTIC - does not validate runtime behavior\n');
  
  // Deduplicate: server/src already includes server/src/modules
  const serverDirs = [
    join(ROOT, 'server/src')
  ];
  
  // Use Set to deduplicate files
  const allFilesSet = new Set();
  for (const dir of serverDirs) {
    for (const f of findTsFiles(dir, [])) {
      allFilesSet.add(f);
    }
  }
  const allFiles = [...allFilesSet];
  
  console.log(`📊 Scanning ${allFiles.length} unique files for event patterns...`);
  
  const allOperations = [];
  
  // Analyze each file
  for (const file of allFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      const ops = extractEventOperations(file, content);
      
      // Track UNKNOWN events (parsing failures)
      const unknownEmits = ops.emits.filter(e => e.unresolved);
      if (unknownEmits.length > 0) {
        results.unresolvedEventReferences.push({
          file: relative(ROOT, file),
          count: unknownEmits.length,
          samples: unknownEmits.slice(0, 3)
        });
      }
      
      // Filter out UNKNOWN for normal graph building
      const resolvedEmits = ops.emits.filter(e => !e.unresolved);
      
      if (resolvedEmits.length > 0 || ops.publishes.length > 0 || ops.broadcasts.length > 0) {
        results.emitters.push({
          file: relative(ROOT, file),
          operations: {
            emits: resolvedEmits,
            publishes: ops.publishes,
            broadcasts: ops.broadcasts
          }
        });
      }
      
      if (ops.subscribes.length > 0 || ops.onHandlers.length > 0) {
        results.consumers.push({
          file: relative(ROOT, file),
          operations: {
            subscribes: ops.subscribes,
            onHandlers: ops.onHandlers
          }
        });
      }
      
      if (resolvedEmits.length > 0 || ops.publishes.length > 0 || 
          ops.subscribes.length > 0 || ops.onHandlers.length > 0) {
        // Use resolved emits for graph building
        allOperations.push({
          ...ops,
          emits: resolvedEmits
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  // Build event graph
  results.eventGraph = buildEventGraph(allOperations);
  
  // Find orphan events (emitted but never consumed)
  for (const [event, data] of Object.entries(results.eventGraph.events)) {
    if (data.emitCount > 0 && data.consumerCount === 0) {
      results.orphanEvents.push({
        event,
        emitCount: data.emitCount,
        emitterFiles: results.eventGraph.emitters 
          ? Object.entries(results.eventGraph.emitters)
              .filter(([_, events]) => events.includes(event))
              .map(([file]) => file)
          : []
      });
    }
  }
  
  // Find dead subscriptions (subscribed but never emitted)
  const emittedEvents = new Set(
    Object.entries(results.eventGraph.events)
      .filter(([_, data]) => data.emitCount > 0)
      .map(([event]) => event)
  );
  
  for (const [event, data] of Object.entries(results.eventGraph.events)) {
    if (data.emitCount === 0 && data.consumerCount > 0) {
      results.deadSubscriptions.push({
        event,
        consumerCount: data.consumerCount,
        consumerFiles: data.consumerFiles
      });
    }
  }
  
  // Output results
  console.log('\n' + '='.repeat(50));
  console.log('📋 AUDIT RESULTS');
  console.log('='.repeat(50));
  
  console.log(`\n✅ EVENT EMITTERS: ${results.emitters.length}`);
  if (VERBOSE) {
    for (const emitter of results.emitters.slice(0, 15)) {
      const totalEmits = emitter.operations.emits.length + 
                        emitter.operations.publishes.length + 
                        emitter.operations.broadcasts.length;
      console.log(`   - ${emitter.file} (${totalEmits} events)`);
    }
    if (results.emitters.length > 15) {
      console.log(`   ... and ${results.emitters.length - 15} more`);
    }
  }
  
  console.log(`\n✅ EVENT CONSUMERS: ${results.consumers.length}`);
  if (VERBOSE) {
    for (const consumer of results.consumers.slice(0, 15)) {
      const totalSubs = consumer.operations.subscribes.length + 
                        consumer.operations.onHandlers.length;
      console.log(`   - ${consumer.file} (${totalSubs} subscriptions)`);
    }
  }
  
  console.log(`\n⚠️  ORPHAN EVENTS: ${results.orphanEvents.length}`);
  if (results.orphanEvents.length > 0) {
    console.log('   Events emitted but never consumed:');
    for (const orphan of results.orphanEvents.slice(0, 15)) {
      console.log(`   - ${orphan.event}`);
      console.log(`     Emitted ${orphan.emitCount} time(s)`);
      if (VERBOSE && orphan.emitterFiles.length > 0) {
        console.log(`     By: ${orphan.emitterFiles.slice(0, 3).join(', ')}`);
      }
    }
    if (results.orphanEvents.length > 15) {
      console.log(`   ... and ${results.orphanEvents.length - 15} more`);
    }
  }
  
  console.log(`\n⚠️  DEAD SUBSCRIPTIONS: ${results.deadSubscriptions.length}`);
  if (results.deadSubscriptions.length > 0) {
    console.log('   Events subscribed to but never emitted:');
    for (const dead of results.deadSubscriptions.slice(0, 10)) {
      console.log(`   - ${dead.event}`);
      console.log(`     Subscribed by ${dead.consumerCount} file(s)`);
    }
    if (results.deadSubscriptions.length > 10) {
      console.log(`   ... and ${results.deadSubscriptions.length - 10} more`);
    }
  }
  
  console.log(`\n📊 UNRESOLVED EVENT REFERENCES: ${results.unresolvedEventReferences.length}`);
  if (results.unresolvedEventReferences.length > 0) {
    console.log('   (Could not parse event names from these locations)');
    for (const unknown of results.unresolvedEventReferences.slice(0, 5)) {
      console.log(`   - ${unknown.file} (${unknown.count} occurrences)`);
    }
    if (results.unresolvedEventReferences.length > 5) {
      console.log(`   ... and ${results.unresolvedEventReferences.length - 5} more`);
    }
  }
  
  // Event type summary
  const eventTypes = Object.keys(results.eventGraph.events);
  console.log(`\n📊 UNIQUE EVENT TYPES: ${eventTypes.length}`);
  if (VERBOSE) {
    for (const event of eventTypes.slice(0, 20)) {
      const data = results.eventGraph.events[event];
      const status = data.consumerCount > 0 ? '✓' : '⚠️';
      console.log(`   ${status} ${event}: emit=${data.emitCount}, consumers=${data.consumerCount}`);
    }
  }
  
  // Generate mermaid diagram if requested
  if (OUTPUT_MERMAID) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MERMAID EVENT FLOW DIAGRAM');
    console.log('='.repeat(50));
    console.log(generateMermaidDiagram(results.eventGraph));
  }
  
  // Add warning about static analysis limitations
  results.warnings.push({
    type: 'STATIC_HEURISTIC',
    message: 'This audit only analyzes source code patterns. Runtime behavior may differ.'
  });
  
  // Summary
  const hasIssues = results.orphanEvents.length > 0 || results.deadSubscriptions.length > 0;
  
  console.log('\n' + '='.repeat(50));
  if (hasIssues) {
    if (BASELINE_MODE) {
      console.log('✅ BASELINE MODE: Findings reported (no failure)');
      console.log(`   - ${results.orphanEvents.length} orphan events`);
      console.log(`   - ${results.deadSubscriptions.length} dead subscriptions`);
      if (OUTPUT_JSON) {
        console.log('\n' + JSON.stringify(results, null, 2));
      }
      process.exit(0);
    } else {
      console.log('⚠️  ISSUES FOUND - Review orphan events and dead subscriptions');
      console.log('   Use --baseline to report without failing');
      if (OUTPUT_JSON) {
        console.log('\n' + JSON.stringify(results, null, 2));
      }
      process.exit(2);
    }
  } else {
    console.log('✅ All events validated successfully');
    if (OUTPUT_JSON) {
      console.log('\n' + JSON.stringify(results, null, 2));
    }
    process.exit(0);
  }
}

/**
 * Generate mermaid diagram for event flow
 */
function generateMermaidDiagram(graph) {
  const lines = ['```mermaid', 'flowchart LR'];
  
  // Add emitters
  for (const [file, events] of Object.entries(graph.emitters)) {
    const nodeId = 'E_' + file.replace(/[\/\-\.]/g, '_').substring(0, 20);
    lines.push(`    ${nodeId}["📤 ${basename(file)}"]`);
  }
  
  // Add consumers
  for (const [file, events] of Object.entries(graph.consumers)) {
    const nodeId = 'C_' + file.replace(/[\/\-\.]/g, '_').substring(0, 20);
    lines.push(`    ${nodeId}["📥 ${basename(file)}"]`);
  }
  
  // Add event nodes
  for (const event of Object.keys(graph.events)) {
    const nodeId = 'EV_' + event.replace(/[\/\-\.]/g, '_');
    const data = graph.events[event];
    const color = data.consumerCount > 0 ? 'green' : 'red';
    lines.push(`    ${nodeId}("${event}"):::${color}`);
  }
  
  // Add edges
  lines.push('');
  for (const [file, events] of Object.entries(graph.emitters)) {
    const emitterId = 'E_' + file.replace(/[\/\-\.]/g, '_').substring(0, 20);
    for (const event of events) {
      const eventId = 'EV_' + event.replace(/[\/\-\.]/g, '_');
      lines.push(`    ${emitterId} --> ${eventId}`);
    }
  }
  
  for (const [event, data] of Object.entries(graph.events)) {
    const eventId = 'EV_' + event.replace(/[\/\-\.]/g, '_');
    for (const consumerFile of data.consumerFiles) {
      const consumerId = 'C_' + consumerFile.replace(/[\/\-\.]/g, '_').substring(0, 20);
      lines.push(`    ${eventId} --> ${consumerId}`);
    }
  }
  
  lines.push('');
  lines.push('    classDef green fill:#90EE90');
  lines.push('    classDef red fill:#FFB6C1');
  lines.push('```');
  
  return lines.join('\n');
}

runAudit().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
