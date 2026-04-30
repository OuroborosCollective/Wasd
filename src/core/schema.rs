use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorldSsot {
    pub version: String,
    pub metadata: Metadata,
    pub config: WorldConfig,
    pub schema_definitions: HashMap<String, serde_json::Value>,
    pub entities: Vec<Entity>,
    pub systems: Vec<SystemConfig>,
    pub initial_state: WorldState,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    pub id: String,
    pub name: String,
    pub author: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorldConfig {
    pub tick_rate_ms: u32,
    pub max_entities: Option<usize>,
    pub physics_enabled: bool,
    pub dimensions: Vector3,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vector3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Entity {
    pub id: String,
    pub prototype: Option<String>,
    pub components: HashMap<String, serde_json::Value>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemConfig {
    pub id: String,
    pub entry_point: String,
    pub permissions: Vec<String>,
    pub settings: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorldState {
    pub global_vars: HashMap<String, serde_json::Value>,
    pub environment: EnvironmentState,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentState {
    pub time_of_day: f32,
    pub active_events: Vec<String>,
}