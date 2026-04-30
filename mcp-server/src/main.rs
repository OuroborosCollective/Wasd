use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Option<Value>,
    result: Option<Value>,
    error: Option<Value>,
}

const WORLD_SSOT_URI: &str = "file://world_ssot.json";
const ASSET_BRAIN_URI: &str = "file://asset_brain_integration.json";

const WORLD_SSOT_CONTENT: &str = r#"{
  "version": "1.0.0",
  "entities": [],
  "metadata": {
    "description": "World Single Source of Truth"
  }
}"#;

const ASSET_BRAIN_CONTENT: &str = r#"{
  "integration_type": "ASSET_BRAIN",
  "status": "active",
  "mappings": {}
}"#;

#[tokio::main]
async fn main() -> io::Result<()> {
    let stdin = io::stdin();
    let mut reader = stdin.lock();
    let mut line = String::new();

    while reader.read_line(&mut line)? > 0 {
        let request: Result<JsonRpcRequest, _> = serde_json::from_str(&line);
        
        if let Ok(req) = request {
            let response = handle_request(req).await;
            let response_json = serde_json::to_string(&response).unwrap();
            println!("{}", response_json);
            io::stdout().flush()?;
        }
        
        line.clear();
    }

    Ok(())
}

async fn handle_request(req: JsonRpcRequest) -> JsonRpcResponse {
    let result = match req.method.as_str() {
        "initialize" => Some(json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "resources": {}
            },
            "serverInfo": {
                "name": "asset-brain-mcp-server",
                "version": "0.1.0"
            }
        })),
        "resources/list" => Some(json!({
            "resources": [
                {
                    "uri": WORLD_SSOT_URI,
                    "name": "World SSOT",
                    "mimeType": "application/json",
                    "description": "The Single Source of Truth for the world state"
                },
                {
                    "uri": ASSET_BRAIN_URI,
                    "name": "Asset Brain Integration",
                    "mimeType": "application/json",
                    "description": "Configuration and logic for Asset Brain integration"
                }
            ]
        })),
        "resources/read" => {
            let uri = req.params.as_ref()
                .and_then(|p| p.get("uri"))
                .and_then(|u| u.as_str());

            match uri {
                Some(WORLD_SSOT_URI) => Some(json!({
                    "contents": [{
                        "uri": WORLD_SSOT_URI,
                        "mimeType": "application/json",
                        "text": WORLD_SSOT_CONTENT
                    }]
                })),
                Some(ASSET_BRAIN_URI) => Some(json!({
                    "contents": [{
                        "uri": ASSET_BRAIN_URI,
                        "mimeType": "application/json",
                        "text": ASSET_BRAIN_CONTENT
                    }]
                })),
                _ => None
            }
        },
        "notifications/initialized" => return JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id: None,
            result: None,
            error: None,
        },
        _ => None,
    };

    if let Some(res) = result {
        JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id: req.id,
            result: Some(res),
            error: None,
        }
    } else {
        JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id: req.id,
            result: None,
            error: Some(json!({
                "code": -32601,
                "message": "Method not found or resource not found"
            })),
        }
    }
}