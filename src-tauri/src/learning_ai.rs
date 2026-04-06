use reqwest::header::{CONTENT_TYPE, HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;

use crate::learning::LearningSource;

const LOCAL_AI_DEFAULT_BASE_URL: &str = "http://127.0.0.1:8765";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RagDocument {
    id: String,
    title: String,
    text: String,
    source_type: String,
    metadata: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RagIndexRequest {
    session_id: String,
    version_hash: String,
    documents: Vec<RagDocument>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TextGenerationRequest {
    system: String,
    prompt: String,
    session_id: Option<String>,
    use_rag: bool,
    query: Option<String>,
    top_k: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct JsonGenerationRequest {
    system: String,
    prompt: String,
    session_id: Option<String>,
    use_rag: bool,
    query: Option<String>,
    top_k: i64,
    schema: Value,
}

#[derive(Debug, Deserialize)]
struct LocalAiResponse {
    content: String,
}

fn local_ai_base_url() -> String {
    env::var("DAILYFORGE_AI_BASE_URL").unwrap_or_else(|_| LOCAL_AI_DEFAULT_BASE_URL.to_string())
}

fn local_ai_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers
}

fn backend_unavailable_message(error: &reqwest::Error) -> String {
    if error.is_connect() {
        return "Local AI backend is not running. Start it using: python -m uvicorn app.main:app --host 127.0.0.1 --port 8765".to_string();
    }
    format!("Local AI backend request failed: {}", error)
}

pub fn build_rag_documents(sources: &[LearningSource]) -> Vec<RagDocument> {
    sources
        .iter()
        .filter_map(|source| {
            let text = source
                .extracted_text
                .as_deref()
                .or(source.raw_content.as_deref())
                .map(str::trim)
                .filter(|value| !value.is_empty())?
                .to_string();

            Some(RagDocument {
                id: source.id.clone(),
                title: source.title.clone(),
                text,
                source_type: source.source_type.clone(),
                metadata: source.metadata_json.clone(),
            })
        })
        .collect()
}

pub async fn ensure_rag_indexed(
    session_id: &str,
    version_hash: &str,
    sources: &[LearningSource],
) -> Result<(), String> {
    let documents = build_rag_documents(sources);
    if documents.is_empty() {
        return Ok(());
    }

    let payload = RagIndexRequest {
        session_id: session_id.to_string(),
        version_hash: version_hash.to_string(),
        documents,
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/v1/rag/index", local_ai_base_url()))
        .headers(local_ai_headers())
        .json(&payload)
        .send()
        .await
        .map_err(|error| backend_unavailable_message(&error))?;

    let status = response.status();
    let body = response.text().await.map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(extract_backend_error("Local AI index request failed", &body));
    }

    Ok(())
}

pub async fn local_json_completion(
    system_prompt: &str,
    user_prompt: &str,
    session_id: Option<&str>,
    query: Option<&str>,
    schema: Value,
) -> Result<Value, String> {
    let payload = JsonGenerationRequest {
        system: system_prompt.to_string(),
        prompt: user_prompt.to_string(),
        session_id: session_id.map(ToOwned::to_owned),
        use_rag: session_id.is_some() && query.is_some(),
        query: query.map(ToOwned::to_owned),
        top_k: 6,
        schema,
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/v1/generate/json", local_ai_base_url()))
        .headers(local_ai_headers())
        .json(&payload)
        .send()
        .await
        .map_err(|error| backend_unavailable_message(&error))?;

    let status = response.status();
    let body = response.text().await.map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(extract_backend_error("Local AI request failed", &body));
    }

    let parsed: LocalAiResponse = serde_json::from_str(&body)
        .map_err(|error| format!("Invalid local AI response: {}", error))?;
    serde_json::from_str(&parsed.content)
        .map_err(|error| format!("Malformed JSON content from local AI: {}", error))
}

pub async fn local_text_completion(
    system_prompt: &str,
    user_prompt: &str,
    session_id: Option<&str>,
    query: Option<&str>,
) -> Result<String, String> {
    let payload = TextGenerationRequest {
        system: system_prompt.to_string(),
        prompt: user_prompt.to_string(),
        session_id: session_id.map(ToOwned::to_owned),
        use_rag: session_id.is_some() && query.is_some(),
        query: query.map(ToOwned::to_owned),
        top_k: 6,
    };

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/v1/generate/text", local_ai_base_url()))
        .headers(local_ai_headers())
        .json(&payload)
        .send()
        .await
        .map_err(|error| backend_unavailable_message(&error))?;

    let status = response.status();
    let body = response.text().await.map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(extract_backend_error("Local AI request failed", &body));
    }

    let parsed: LocalAiResponse = serde_json::from_str(&body)
        .map_err(|error| format!("Invalid local AI response: {}", error))?;
    Ok(parsed.content)
}

fn extract_backend_error(prefix: &str, body: &str) -> String {
    let message = serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|value| {
            value["detail"]
                .as_str()
                .map(ToOwned::to_owned)
                .or_else(|| value["error"].as_str().map(ToOwned::to_owned))
        })
        .unwrap_or_else(|| body.to_string());
    format!("{}: {}", prefix, message)
}

pub fn json_schema_summary() -> Value {
    json!({
        "type": "object",
        "properties": {
            "summaryShort": { "type": "string", "minLength": 1 },
            "summaryDetailed": { "type": "string", "minLength": 1 },
            "keyConcepts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "term": { "type": "string" },
                        "explanation": { "type": "string" }
                    },
                    "required": ["term", "explanation"],
                    "additionalProperties": false
                }
            },
            "definitions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "term": { "type": "string" },
                        "definition": { "type": "string" }
                    },
                    "required": ["term", "definition"],
                    "additionalProperties": false
                }
            },
            "actionPoints": {
                "type": "array",
                "items": { "type": "string" }
            }
        },
        "required": ["summaryShort", "summaryDetailed", "keyConcepts", "definitions", "actionPoints"],
        "additionalProperties": false
    })
}

pub fn json_schema_flashcards() -> Value {
    json!({
        "type": "object",
        "properties": {
            "flashcards": {
                "type": "array",
                "minItems": 6,
                "items": {
                    "type": "object",
                    "properties": {
                        "front": { "type": "string", "minLength": 1 },
                        "back": { "type": "string", "minLength": 1 },
                        "difficulty": { "type": "string", "enum": ["easy", "medium", "hard"] },
                        "tags": { "type": "array", "items": { "type": "string" } }
                    },
                    "required": ["front", "back", "difficulty", "tags"],
                    "additionalProperties": false
                }
            }
        },
        "required": ["flashcards"],
        "additionalProperties": false
    })
}

pub fn json_schema_quiz(question_count: i64) -> Value {
    json!({
        "type": "object",
        "properties": {
            "title": { "type": "string", "minLength": 1 },
            "instructions": { "type": "string", "minLength": 1 },
            "questions": {
                "type": "array",
                "minItems": question_count,
                "items": {
                    "type": "object",
                    "properties": {
                        "type": { "type": "string", "enum": ["mcq", "short_answer", "true_false"] },
                        "prompt": { "type": "string", "minLength": 1 },
                        "options": { "type": "array", "items": { "type": "string" } },
                        "answer": { "type": "string", "minLength": 1 },
                        "explanation": { "type": "string", "minLength": 1 },
                        "difficulty": { "type": "string", "enum": ["easy", "medium", "hard"] }
                    },
                    "required": ["type", "prompt", "options", "answer", "explanation", "difficulty"],
                    "additionalProperties": false
                }
            }
        },
        "required": ["title", "instructions", "questions"],
        "additionalProperties": false
    })
}
