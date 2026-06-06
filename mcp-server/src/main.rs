use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: Option<String>,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i64,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
}

const WORLD_SSOT_URI: &str = "file://world_ssot.json";
const ASSET_BRAIN_URI: &str = "file://asset_brain_integration.json";

const WORLD_SSOT_CONTENT: &str = r#"{
  "version": "1.0.0",
  "tickRateHz": 10,
  "determinism": {
    "mode": "stateless",
    "tickMs": 100,
    "mutationPolicy": "commands_only",
    "floatingPointPolicy": "avoid_runtime_float_authority"
  },
  "entities": [],
  "metadata": {
    "description": "World Single Source of Truth",
    "project": "Areloria WASD",
    "engine": "OuroborosEngine"
  }
}"#;

const ASSET_BRAIN_CONTENT: &str = r#"{
  "integration_type": "ASSET_BRAIN",
  "status": "active",
  "deterministicRules": {
    "naming": "content_hash_plus_semantic_type",
    "sorting": "stable_lexicographic",
    "cropPolicy": "deterministic_pixel_bounds",
    "atlasPolicy": "stable_grid_pack"
  },
  "mappings": {}
}"#;

#[tokio::main]
async fn main() -> io::Result<()> {
    let stdin = io::stdin();
    let mut reader = stdin.lock();
    let mut line = String::new();

    while reader.read_line(&mut line)? > 0 {
        let trimmed = line.trim();

        if trimmed.is_empty() {
            line.clear();
            continue;
        }

        let parsed: Result<JsonRpcRequest, _> = serde_json::from_str(trimmed);

        match parsed {
            Ok(req) => {
                // JSON-RPC notifications must not receive a response.
                if req.id.is_none() && req.method.starts_with("notifications/") {
                    handle_notification(req).await;
                    line.clear();
                    continue;
                }

                let response = handle_request(req).await;
                write_response(response)?;
            }
            Err(err) => {
                let response = JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: None,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32700,
                        message: "Parse error".to_string(),
                        data: Some(json!({
                            "details": err.to_string()
                        })),
                    }),
                };

                write_response(response)?;
            }
        }

        line.clear();
    }

    Ok(())
}

fn write_response(response: JsonRpcResponse) -> io::Result<()> {
    let response_json = serde_json::to_string(&response)
        .unwrap_or_else(|_| {
            r#"{"jsonrpc":"2.0","error":{"code":-32603,"message":"Internal serialization error"}}"#
                .to_string()
        });

    println!("{}", response_json);
    io::stdout().flush()
}

async fn handle_notification(req: JsonRpcRequest) {
    match req.method.as_str() {
        "notifications/initialized" => {
            // Intentionally no response.
        }
        _ => {
            // Unknown notifications are ignored by design.
        }
    }
}

async fn handle_request(req: JsonRpcRequest) -> JsonRpcResponse {
    if req.jsonrpc.as_deref() != Some("2.0") {
        return error_response(
            req.id,
            -32600,
            "Invalid Request",
            Some(json!({
                "reason": "jsonrpc must be exactly \"2.0\""
            })),
        );
    }

    match req.method.as_str() {
        "initialize" => success_response(req.id, json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "resources": {
                    "subscribe": false,
                    "listChanged": false
                }
            },
            "serverInfo": {
                "name": "asset-brain-mcp-server",
                "version": "0.2.0"
            }
        })),

        "resources/list" => success_response(req.id, json!({
            "resources": [
                {
                    "uri": WORLD_SSOT_URI,
                    "name": "World SSOT",
                    "mimeType": "application/json",
                    "description": "Deterministic Single Source of Truth for world state, tick policy, and mutation rules"
                },
                {
                    "uri": ASSET_BRAIN_URI,
                    "name": "Asset Brain Integration",
                    "mimeType": "application/json",
                    "description": "Deterministic asset ingestion, naming, sorting, cropping, and atlas mapping policy"
                }
            ]
        })),

        "resources/read" => read_resource(req.id, req.params),

        _ => error_response(
            req.id,
            -32601,
            "Method not found",
            Some(json!({
                "method": req.method
            })),
        ),
    }
}

fn read_resource(id: Option<Value>, params: Option<Value>) -> JsonRpcResponse {
    let uri = params
        .as_ref()
        .and_then(|p| p.get("uri"))
        .and_then(|u| u.as_str());

    match uri {
        Some(WORLD_SSOT_URI) => success_response(id, json!({
            "contents": [{
                "uri": WORLD_SSOT_URI,
                "mimeType": "application/json",
                "text": WORLD_SSOT_CONTENT
            }]
        })),

        Some(ASSET_BRAIN_URI) => success_response(id, json!({
            "contents": [{
                "uri": ASSET_BRAIN_URI,
                "mimeType": "application/json",
                "text": ASSET_BRAIN_CONTENT
            }]
        })),

        Some(unknown_uri) => error_response(
            id,
            -32002,
            "Resource not found",
            Some(json!({
                "uri": unknown_uri,
                "available": [
                    WORLD_SSOT_URI,
                    ASSET_BRAIN_URI
                ]
            })),
        ),

        None => error_response(
            id,
            -32602,
            "Invalid params",
            Some(json!({
                "required": {
                    "uri": "string"
                }
            })),
        ),
    }
}

fn success_response(id: Option<Value>, result: Value) -> JsonRpcResponse {
    JsonRpcResponse {
        jsonrpc: "2.0".to_string(),
        id,
        result: Some(result),
        error: None,
    }
}

fn error_response(
    id: Option<Value>,
    code: i64,
    message: impl Into<String>,
    data: Option<Value>,
) -> JsonRpcResponse {
    JsonRpcResponse {
        jsonrpc: "2.0".to_string(),
        id,
        result: None,
        error: Some(JsonRpcError {
            code,
            message: message.into(),
            data,
        }),
    }
}
