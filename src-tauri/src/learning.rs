use base64::Engine;
use chrono::{Duration, Utc};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, HeaderMap, HeaderValue};
use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    env,
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const DB_FILENAME: &str = "dailyforge.db";
const OPENAI_CHAT_COMPLETIONS_URL: &str = "https://api.openai.com/v1/chat/completions";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LearningSessionCard {
    pub id: String,
    pub title: String,
    pub subject: String,
    pub description: String,
    pub goals: String,
    pub status: String,
    pub completion_percent: i64,
    pub confidence_score: i64,
    pub total_study_minutes: i64,
    pub created_at: String,
    pub updated_at: String,
    pub last_studied_at: Option<String>,
    pub source_count: i64,
    pub flashcard_count: i64,
    pub quiz_count: i64,
    pub due_flashcards: i64,
    pub next_review_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LearningSource {
    pub id: String,
    pub session_id: String,
    pub source_type: String,
    pub title: String,
    pub raw_content: Option<String>,
    pub source_url: Option<String>,
    pub file_path: Option<String>,
    pub extracted_text: Option<String>,
    pub metadata_json: Value,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct LearningConcept {
    pub term: String,
    pub explanation: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct LearningDefinition {
    pub term: String,
    pub definition: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LearningSummary {
    pub id: String,
    pub session_id: String,
    pub summary_short: String,
    pub summary_detailed: String,
    pub key_concepts: Vec<LearningConcept>,
    pub definitions: Vec<LearningDefinition>,
    pub action_points: Vec<String>,
    pub generated_at: String,
    pub source_version_hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Flashcard {
    pub id: String,
    pub session_id: String,
    pub front: String,
    pub back: String,
    pub difficulty: String,
    pub tags: Vec<String>,
    pub source_ref: String,
    pub created_at: String,
    pub last_reviewed_at: Option<String>,
    pub next_review_at: Option<String>,
    pub review_count: i64,
    pub correct_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuizQuestion {
    pub id: String,
    pub quiz_id: String,
    pub question_type: String,
    pub prompt: String,
    pub options: Vec<String>,
    pub answer: String,
    pub explanation: String,
    pub difficulty: String,
    pub order_index: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Quiz {
    pub id: String,
    pub session_id: String,
    pub title: String,
    pub instructions: String,
    pub created_at: String,
    pub question_count: i64,
    pub score_percent: Option<i64>,
    pub completed_at: Option<String>,
    pub questions: Vec<QuizQuestion>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TutorMessage {
    pub id: String,
    pub thread_id: String,
    pub role: String,
    pub content: String,
    pub citations: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TutorThread {
    pub id: String,
    pub session_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub messages: Vec<TutorMessage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LearningReview {
    pub id: String,
    pub session_id: String,
    pub review_type: String,
    pub duration_minutes: i64,
    pub confidence_before: Option<i64>,
    pub confidence_after: Option<i64>,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LearningProgressSnapshot {
    pub completion_percent: i64,
    pub confidence_score: i64,
    pub total_study_minutes: i64,
    pub source_count: i64,
    pub flashcard_count: i64,
    pub completed_quiz_count: i64,
    pub average_quiz_score: Option<i64>,
    pub flashcard_accuracy: Option<i64>,
    pub review_count: i64,
    pub tutor_message_count: i64,
    pub next_review_at: Option<String>,
    pub last_studied_at: Option<String>,
    pub recommended_next_step: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LearningSessionDetail {
    pub session: LearningSessionCard,
    pub sources: Vec<LearningSource>,
    pub latest_summary: Option<LearningSummary>,
    pub flashcards: Vec<Flashcard>,
    pub quizzes: Vec<Quiz>,
    pub threads: Vec<TutorThread>,
    pub reviews: Vec<LearningReview>,
    pub progress: LearningProgressSnapshot,
    pub open_tutor_thread_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningSourceBundle {
    #[serde(flatten)]
    pub source: LearningSource,
    pub file_base64: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningSessionBundle {
    pub version: i64,
    pub exported_at: String,
    pub session: LearningSessionCard,
    pub sources: Vec<LearningSourceBundle>,
    pub latest_summary: Option<LearningSummary>,
    pub flashcards: Vec<Flashcard>,
    pub quizzes: Vec<Quiz>,
    pub threads: Vec<TutorThread>,
    pub reviews: Vec<LearningReview>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningFullBackup {
    pub version: i64,
    pub exported_at: String,
    pub sessions: Vec<LearningSessionBundle>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuizSubmissionResult {
    pub score_percent: i64,
    pub correct_count: i64,
    pub total_questions: i64,
    pub weak_topics: Vec<String>,
    pub detail: LearningSessionDetail,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionInput {
    pub title: String,
    pub subject: Option<String>,
    pub description: Option<String>,
    pub goals: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionInput {
    pub title: Option<String>,
    pub subject: Option<String>,
    pub description: Option<String>,
    pub goals: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddSourceInput {
    pub session_id: String,
    pub source_type: String,
    pub title: String,
    pub raw_content: Option<String>,
    pub source_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachFileInput {
    pub session_id: String,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub base64_data: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachFilePathInput {
    pub session_id: String,
    pub file_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateQuizInput {
    pub session_id: String,
    pub question_count: Option<i64>,
    pub difficulty: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewFlashcardInput {
    pub session_id: String,
    pub flashcard_id: String,
    pub correct: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuizAnswerInput {
    pub question_id: String,
    pub answer: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitQuizInput {
    pub session_id: String,
    pub quiz_id: String,
    pub answers: Vec<QuizAnswerInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTutorThreadInput {
    pub session_id: String,
    pub title: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendTutorMessageInput {
    pub session_id: String,
    pub thread_id: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeneratedFlashcard {
    front: String,
    back: String,
    difficulty: String,
    tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeneratedQuizQuestion {
    #[serde(rename = "type")]
    question_type: String,
    prompt: String,
    options: Vec<String>,
    answer: String,
    explanation: String,
    difficulty: String,
}

#[tauri::command]
pub fn learning_list_sessions(app: AppHandle) -> Result<Vec<LearningSessionCard>, String> {
    let conn = open_connection(&app)?;
    list_sessions(&conn)
}

#[tauri::command]
pub fn learning_create_session(
    app: AppHandle,
    input: CreateSessionInput,
) -> Result<LearningSessionCard, String> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err("Session title is required.".into());
    }

    let now = now_iso();
    let conn = open_connection(&app)?;
    let id = learning_id("session");
    conn.execute(
        "INSERT INTO learning_sessions
         (id, title, subject, description, goals, status, completion_percent, confidence_score, total_study_minutes, created_at, updated_at, last_studied_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'active', 0, 0, 0, ?6, ?6, NULL)",
        params![
            id,
            title,
            clean_text(input.subject),
            clean_text(input.description),
            clean_text(input.goals),
            now,
        ],
    )
    .map_err(|error| error.to_string())?;

    fetch_session_card(&conn, &id)
}

#[tauri::command]
pub fn learning_get_session_detail(
    app: AppHandle,
    session_id: String,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    fetch_session_detail(&conn, &session_id)
}

#[tauri::command]
pub fn learning_update_session(
    app: AppHandle,
    session_id: String,
    patch: UpdateSessionInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &session_id)?;
    let current = fetch_session_card(&conn, &session_id)?;
    let title = patch
        .title
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(&current.title)
        .to_string();

    conn.execute(
        "UPDATE learning_sessions
         SET title = ?2,
             subject = ?3,
             description = ?4,
             goals = ?5,
             status = ?6,
             updated_at = ?7
         WHERE id = ?1",
        params![
            session_id,
            title,
            patch.subject.unwrap_or(current.subject),
            patch.description.unwrap_or(current.description),
            patch.goals.unwrap_or(current.goals),
            patch.status.unwrap_or(current.status),
            now_iso(),
        ],
    )
    .map_err(|error| error.to_string())?;

    recalculate_session_metrics(&conn, &session_id)?;
    fetch_session_detail(&conn, &session_id)
}

#[tauri::command]
pub fn learning_delete_session(app: AppHandle, session_id: String) -> Result<(), String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &session_id)?;
    conn.execute("DELETE FROM learning_sessions WHERE id = ?1", params![session_id.clone()])
        .map_err(|error| error.to_string())?;

    let session_dir = session_storage_dir(&app, &session_id)?;
    if session_dir.exists() {
        fs::remove_dir_all(session_dir).map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn learning_add_source(
    app: AppHandle,
    input: AddSourceInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &input.session_id)?;

    let source_type = normalize_source_type(&input.source_type)?;
    let title = input.title.trim();
    if title.is_empty() {
        return Err("Source title is required.".into());
    }

    if source_type == "url"
        && input
            .source_url
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .is_none()
    {
        return Err("URL sources require a valid source URL.".into());
    }

    if (source_type == "text" || source_type == "note")
        && input
            .raw_content
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .is_none()
    {
        return Err("Text and note sources require content.".into());
    }

    let source_id = learning_id("source");
    let raw_content = input
        .raw_content
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);
    let source_url = input
        .source_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);

    conn.execute(
        "INSERT INTO learning_sources
         (id, session_id, type, title, raw_content, source_url, file_path, extracted_text, metadata_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, ?9)",
        params![
            source_id,
            input.session_id,
            source_type,
            title,
            raw_content,
            source_url,
            raw_content,
            json!({}).to_string(),
            now_iso(),
        ],
    )
    .map_err(|error| error.to_string())?;

    touch_session(&conn, &input.session_id)?;
    recalculate_session_metrics(&conn, &input.session_id)?;
    fetch_session_detail(&conn, &input.session_id)
}

#[tauri::command]
pub fn learning_attach_file(
    app: AppHandle,
    input: AttachFileInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &input.session_id)?;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(input.base64_data.as_bytes())
        .map_err(|_| "Could not decode the selected file.".to_string())?;
    store_file_source(
        &conn,
        &app,
        &input.session_id,
        &input.file_name,
        input.mime_type.as_deref(),
        bytes,
    )?;

    touch_session(&conn, &input.session_id)?;
    recalculate_session_metrics(&conn, &input.session_id)?;
    fetch_session_detail(&conn, &input.session_id)
}

#[tauri::command]
pub fn learning_attach_file_from_path(
    app: AppHandle,
    input: AttachFilePathInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &input.session_id)?;

    let source_path = PathBuf::from(&input.file_path);
    if !source_path.exists() || !source_path.is_file() {
        return Err("The selected file could not be found.".into());
    }

    let file_name = source_path
        .file_name()
        .and_then(|value| value.to_str())
        .map(ToOwned::to_owned)
        .ok_or_else(|| "The selected file name is invalid.".to_string())?;
    let bytes = fs::read(&source_path).map_err(|error| error.to_string())?;

    store_file_source(&conn, &app, &input.session_id, &file_name, None, bytes)?;

    touch_session(&conn, &input.session_id)?;
    recalculate_session_metrics(&conn, &input.session_id)?;
    fetch_session_detail(&conn, &input.session_id)
}

#[tauri::command]
pub fn learning_delete_source(
    app: AppHandle,
    session_id: String,
    source_id: String,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &session_id)?;
    let file_path: Option<String> = conn
        .query_row(
            "SELECT file_path FROM learning_sources WHERE id = ?1 AND session_id = ?2",
            params![source_id.clone(), session_id.clone()],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .flatten();

    let deleted = conn
        .execute(
            "DELETE FROM learning_sources WHERE id = ?1 AND session_id = ?2",
            params![source_id, session_id.clone()],
        )
        .map_err(|error| error.to_string())?;
    if deleted == 0 {
        return Err("Source not found.".into());
    }

    if let Some(path) = file_path {
        let stored_file = PathBuf::from(path);
        if stored_file.exists() {
            fs::remove_file(stored_file).map_err(|error| error.to_string())?;
        }
    }

    touch_session(&conn, &session_id)?;
    recalculate_session_metrics(&conn, &session_id)?;
    fetch_session_detail(&conn, &session_id)
}

#[tauri::command]
pub async fn learning_generate_summary(
    app: AppHandle,
    session_id: String,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &session_id)?;
    let session = fetch_session_card(&conn, &session_id)?;
    let sources = list_sources(&conn, &session_id)?;
    let source_context = build_source_context(&sources)?;
    let schema = json!({
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
    });
    let user_prompt = format!(
        "Session title: {}\nSubject: {}\nGoals: {}\n\nStudy material:\n{}",
        session.title, session.subject, session.goals, source_context
    );
    let ai_output = openai_json_completion(
        "You are an academic study assistant for a desktop learning workspace. Build concise, accurate study materials only from the provided session context.",
        &user_prompt,
        "learning_summary",
        schema,
    )
    .await?;
    let key_concepts = parse_json_array_value::<LearningConcept>(&ai_output["keyConcepts"])?;
    let definitions = parse_json_array_value::<LearningDefinition>(&ai_output["definitions"])?;
    let action_points = parse_json_array_value::<String>(&ai_output["actionPoints"])?;

    conn.execute(
        "INSERT INTO learning_summaries
         (id, session_id, summary_short, summary_detailed, key_concepts_json, definitions_json, action_points_json, generated_at, source_version_hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            learning_id("summary"),
            session_id,
            required_string(&ai_output, "summaryShort")?,
            required_string(&ai_output, "summaryDetailed")?,
            serde_json::to_string(&key_concepts).map_err(|error| error.to_string())?,
            serde_json::to_string(&definitions).map_err(|error| error.to_string())?,
            serde_json::to_string(&action_points).map_err(|error| error.to_string())?,
            now_iso(),
            source_version_hash(&sources),
        ],
    )
    .map_err(|error| error.to_string())?;

    log_review(&conn, &session_id, "summary_review", 10, "Generated summary")?;
    touch_session(&conn, &session_id)?;
    recalculate_session_metrics(&conn, &session_id)?;
    fetch_session_detail(&conn, &session_id)
}

#[tauri::command]
pub async fn learning_generate_flashcards(
    app: AppHandle,
    session_id: String,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &session_id)?;
    let session = fetch_session_card(&conn, &session_id)?;
    let sources = list_sources(&conn, &session_id)?;
    let source_context = build_source_context(&sources)?;
    let latest_summary = latest_summary(&conn, &session_id)?;
    let user_prompt = format!(
        "Session title: {}\nSubject: {}\nSummary:\n{}\n\nStudy material:\n{}",
        session.title,
        session.subject,
        latest_summary
            .as_ref()
            .map(|summary| summary.summary_detailed.clone())
            .unwrap_or_default(),
        source_context
    );
    let schema = json!({
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
    });
    let ai_output = openai_json_completion(
        "You create high-quality active-recall flashcards for a desktop study workspace. Use only the supplied material.",
        &user_prompt,
        "learning_flashcards",
        schema,
    )
    .await?;
    let cards = parse_json_array_value::<GeneratedFlashcard>(&ai_output["flashcards"])?;

    conn.execute(
        "DELETE FROM learning_flashcards WHERE session_id = ?1",
        params![session_id.clone()],
    )
    .map_err(|error| error.to_string())?;
    for card in cards {
        conn.execute(
            "INSERT INTO learning_flashcards
             (id, session_id, front, back, difficulty, tags_json, source_ref, created_at, last_reviewed_at, next_review_at, review_count, correct_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, '', ?7, NULL, NULL, 0, 0)",
            params![
                learning_id("card"),
                session_id,
                card.front.trim(),
                card.back.trim(),
                card.difficulty,
                serde_json::to_string(&card.tags).map_err(|error| error.to_string())?,
                now_iso(),
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    touch_session(&conn, &session_id)?;
    recalculate_session_metrics(&conn, &session_id)?;
    fetch_session_detail(&conn, &session_id)
}

#[tauri::command]
pub fn learning_review_flashcard(
    app: AppHandle,
    input: ReviewFlashcardInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &input.session_id)?;
    let card = conn
        .query_row(
            "SELECT id, session_id, front, back, difficulty, tags_json, source_ref, created_at, last_reviewed_at, next_review_at, review_count, correct_count
             FROM learning_flashcards
             WHERE id = ?1 AND session_id = ?2",
            params![input.flashcard_id, input.session_id],
            map_flashcard_row,
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Flashcard not found.".to_string())?;

    conn.execute(
        "UPDATE learning_flashcards
         SET review_count = ?3,
             correct_count = ?4,
             last_reviewed_at = ?5,
             next_review_at = ?6
         WHERE id = ?1 AND session_id = ?2",
        params![
            input.flashcard_id,
            input.session_id,
            card.review_count + 1,
            card.correct_count + if input.correct { 1 } else { 0 },
            now_iso(),
            compute_next_review_at(card.review_count, input.correct),
        ],
    )
    .map_err(|error| error.to_string())?;

    log_review(
        &conn,
        &input.session_id,
        "flashcard_review",
        2,
        if input.correct {
            "Marked flashcard correct"
        } else {
            "Marked flashcard incorrect"
        },
    )?;
    touch_session(&conn, &input.session_id)?;
    recalculate_session_metrics(&conn, &input.session_id)?;
    fetch_session_detail(&conn, &input.session_id)
}

#[tauri::command]
pub async fn learning_generate_quiz(
    app: AppHandle,
    input: GenerateQuizInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &input.session_id)?;
    let session = fetch_session_card(&conn, &input.session_id)?;
    let sources = list_sources(&conn, &input.session_id)?;
    let source_context = build_source_context(&sources)?;
    let latest_summary = latest_summary(&conn, &input.session_id)?;
    let question_count = input.question_count.unwrap_or(8).clamp(4, 12);
    let difficulty = input
        .difficulty
        .unwrap_or_else(|| "mixed".to_string())
        .to_lowercase();
    let user_prompt = format!(
        "Session title: {}\nSubject: {}\nDifficulty: {}\nQuestion count: {}\nSummary:\n{}\n\nStudy material:\n{}",
        session.title,
        session.subject,
        difficulty,
        question_count,
        latest_summary
            .as_ref()
            .map(|summary| summary.summary_detailed.clone())
            .unwrap_or_default(),
        source_context
    );
    let schema = json!({
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
    });
    let ai_output = openai_json_completion(
        "You create rigorous study quizzes based only on the supplied learning session context. Avoid asking about information not present in the material.",
        &user_prompt,
        "learning_quiz",
        schema,
    )
    .await?;
    let questions = parse_json_array_value::<GeneratedQuizQuestion>(&ai_output["questions"])?;
    let quiz_id = learning_id("quiz");
    conn.execute(
        "INSERT INTO learning_quizzes
         (id, session_id, title, instructions, created_at, question_count, score_percent, completed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL)",
        params![
            quiz_id,
            input.session_id,
            required_string(&ai_output, "title")?,
            required_string(&ai_output, "instructions")?,
            now_iso(),
            questions.len() as i64,
        ],
    )
    .map_err(|error| error.to_string())?;

    for (index, question) in questions.into_iter().enumerate() {
        conn.execute(
            "INSERT INTO learning_quiz_questions
             (id, quiz_id, type, prompt, options_json, answer, explanation, difficulty, order_index)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                learning_id("question"),
                quiz_id,
                question.question_type,
                question.prompt.trim(),
                serde_json::to_string(&question.options).map_err(|error| error.to_string())?,
                question.answer.trim(),
                question.explanation.trim(),
                question.difficulty,
                (index + 1) as i64,
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    touch_session(&conn, &input.session_id)?;
    recalculate_session_metrics(&conn, &input.session_id)?;
    fetch_session_detail(&conn, &input.session_id)
}

#[tauri::command]
pub fn learning_submit_quiz(
    app: AppHandle,
    input: SubmitQuizInput,
) -> Result<QuizSubmissionResult, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &input.session_id)?;
    let quiz = fetch_quiz(&conn, &input.quiz_id)?.ok_or_else(|| "Quiz not found.".to_string())?;
    if quiz.session_id != input.session_id {
        return Err("Quiz does not belong to this session.".into());
    }

    let mut correct_count = 0_i64;
    let mut weak_topics = Vec::new();
    for question in &quiz.questions {
        let submitted = input
            .answers
            .iter()
            .find(|answer| answer.question_id == question.id)
            .map(|answer| normalize_answer(&answer.answer))
            .unwrap_or_default();
        if submitted == normalize_answer(&question.answer) {
            correct_count += 1;
        } else {
            weak_topics.push(question.prompt.clone());
        }
    }

    let total_questions = quiz.questions.len() as i64;
    let score_percent = if total_questions == 0 {
        0
    } else {
        ((correct_count * 100) / total_questions).clamp(0, 100)
    };
    conn.execute(
        "UPDATE learning_quizzes
         SET score_percent = ?2, completed_at = ?3
         WHERE id = ?1",
        params![input.quiz_id, score_percent, now_iso()],
    )
    .map_err(|error| error.to_string())?;

    log_review(
        &conn,
        &input.session_id,
        "quiz_attempt",
        10,
        &format!("Completed quiz '{}' with {}%", quiz.title, score_percent),
    )?;
    touch_session(&conn, &input.session_id)?;
    recalculate_session_metrics(&conn, &input.session_id)?;

    Ok(QuizSubmissionResult {
        score_percent,
        correct_count,
        total_questions,
        weak_topics,
        detail: fetch_session_detail(&conn, &input.session_id)?,
    })
}

#[tauri::command]
pub fn learning_create_tutor_thread(
    app: AppHandle,
    input: CreateTutorThreadInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &input.session_id)?;
    conn.execute(
        "INSERT INTO learning_tutor_threads
         (id, session_id, title, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![
            learning_id("thread"),
            input.session_id,
            clean_text(input.title).unwrap_or_else(|| "New Tutor Thread".to_string()),
            now_iso(),
        ],
    )
    .map_err(|error| error.to_string())?;

    touch_session(&conn, &input.session_id)?;
    fetch_session_detail(&conn, &input.session_id)
}

#[tauri::command]
pub async fn learning_send_tutor_message(
    app: AppHandle,
    input: SendTutorMessageInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    ensure_session_exists(&conn, &input.session_id)?;
    let message = input.message.trim();
    if message.is_empty() {
        return Err("Tutor messages cannot be empty.".into());
    }

    let session = fetch_session_card(&conn, &input.session_id)?;
    let sources = list_sources(&conn, &input.session_id)?;
    let summary = latest_summary(&conn, &input.session_id)?;
    let thread = fetch_thread(&conn, &input.thread_id)?
        .ok_or_else(|| "Tutor thread not found.".to_string())?;
    if thread.session_id != input.session_id {
        return Err("Tutor thread does not belong to this session.".into());
    }

    conn.execute(
        "INSERT INTO learning_tutor_messages
         (id, thread_id, role, content, citations_json, created_at)
         VALUES (?1, ?2, 'user', ?3, '[]', ?4)",
        params![learning_id("message"), input.thread_id, message, now_iso()],
    )
    .map_err(|error| error.to_string())?;

    let prior_messages = thread
        .messages
        .iter()
        .rev()
        .take(8)
        .rev()
        .map(|entry| format!("{}: {}", entry.role, entry.content))
        .collect::<Vec<_>>()
        .join("\n");
    let flashcard_context = list_flashcards(&conn, &input.session_id)?
        .into_iter()
        .take(8)
        .map(|card| format!("Q: {} | A: {}", card.front, card.back))
        .collect::<Vec<_>>()
        .join("\n");
    let user_prompt = format!(
        "Session title: {}\nSubject: {}\nGoals: {}\nSummary:\n{}\nRecent flashcards:\n{}\nRecent thread:\n{}\nStudy material:\n{}\n\nUser question:\n{}",
        session.title,
        session.subject,
        session.goals,
        summary
            .as_ref()
            .map(|entry| entry.summary_detailed.clone())
            .unwrap_or_default(),
        flashcard_context,
        prior_messages,
        build_source_context(&sources)?,
        message
    );
    let assistant_reply = openai_text_completion(
        "You are an AI tutor for a desktop learning app. Answer only from the provided session context. If the context does not support the answer, say that clearly. Prefer concise, helpful explanations and revision prompts.",
        &user_prompt,
    )
    .await?;

    let now = now_iso();
    conn.execute(
        "INSERT INTO learning_tutor_messages
         (id, thread_id, role, content, citations_json, created_at)
         VALUES (?1, ?2, 'assistant', ?3, '[]', ?4)",
        params![learning_id("message"), input.thread_id, assistant_reply.trim(), now],
    )
    .map_err(|error| error.to_string())?;
    conn.execute(
        "UPDATE learning_tutor_threads SET updated_at = ?2 WHERE id = ?1",
        params![input.thread_id, now],
    )
    .map_err(|error| error.to_string())?;

    log_review(&conn, &input.session_id, "tutor_chat", 5, "Used the AI tutor")?;
    touch_session(&conn, &input.session_id)?;
    recalculate_session_metrics(&conn, &input.session_id)?;
    fetch_session_detail(&conn, &input.session_id)
}

#[tauri::command]
pub fn learning_export_session_bundle(
    app: AppHandle,
    session_id: String,
) -> Result<LearningSessionBundle, String> {
    let conn = open_connection(&app)?;
    let detail = fetch_session_detail(&conn, &session_id)?;
    session_bundle_from_detail(&detail)
}

#[tauri::command]
pub fn learning_export_flashcards_csv(app: AppHandle, session_id: String) -> Result<String, String> {
    let conn = open_connection(&app)?;
    let flashcards = list_flashcards(&conn, &session_id)?;
    let mut lines = vec!["Front,Back,Difficulty,Tags,Review Count,Correct Count".to_string()];
    for card in flashcards {
        lines.push(format!(
            "{},{},{},{},{},{}",
            csv_escape(&card.front),
            csv_escape(&card.back),
            csv_escape(&card.difficulty),
            csv_escape(&card.tags.join(" | ")),
            card.review_count,
            card.correct_count
        ));
    }
    Ok(lines.join("\n"))
}

#[tauri::command]
pub fn learning_import_session_bundle(
    app: AppHandle,
    bundle: LearningSessionBundle,
) -> Result<LearningSessionCard, String> {
    let session_id = bundle.session.id.clone();
    let conn = open_connection(&app)?;
    import_session_bundle_into_db(&app, &conn, bundle)?;
    fetch_session_card(&conn, &session_id)
}

#[tauri::command]
pub fn learning_export_full_backup(app: AppHandle) -> Result<LearningFullBackup, String> {
    let conn = open_connection(&app)?;
    let mut sessions = Vec::new();
    for session in list_sessions(&conn)? {
        sessions.push(session_bundle_from_detail(&fetch_session_detail(&conn, &session.id)?)?);
    }
    Ok(LearningFullBackup {
        version: 1,
        exported_at: now_iso(),
        sessions,
    })
}

#[tauri::command]
pub fn learning_import_full_backup(
    app: AppHandle,
    backup: LearningFullBackup,
) -> Result<Vec<LearningSessionCard>, String> {
    let conn = open_connection(&app)?;
    conn.execute_batch(
        "DELETE FROM learning_tutor_messages;
         DELETE FROM learning_tutor_threads;
         DELETE FROM learning_quiz_questions;
         DELETE FROM learning_quizzes;
         DELETE FROM learning_flashcards;
         DELETE FROM learning_summaries;
         DELETE FROM learning_sources;
         DELETE FROM learning_reviews;
         DELETE FROM learning_sessions;",
    )
    .map_err(|error| error.to_string())?;

    for bundle in backup.sessions {
        import_session_bundle_into_db(&app, &conn, bundle)?;
    }

    list_sessions(&conn)
}

fn open_connection(app: &AppHandle) -> Result<Connection, String> {
    let db_path = app_data_dir(app)?.join(DB_FILENAME);
    let connection = Connection::open(db_path).map_err(|error| error.to_string())?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;")
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

fn learning_storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app_data_dir(app)?.join("learning").join("sessions");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

fn session_storage_dir(app: &AppHandle, session_id: &str) -> Result<PathBuf, String> {
    Ok(learning_storage_dir(app)?.join(session_id))
}

fn session_source_storage_dir(app: &AppHandle, session_id: &str) -> Result<PathBuf, String> {
    let directory = session_storage_dir(app, session_id)?.join("sources");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

fn store_file_source(
    conn: &Connection,
    app: &AppHandle,
    session_id: &str,
    file_name: &str,
    mime_type: Option<&str>,
    bytes: Vec<u8>,
) -> Result<(), String> {
    let source_type = infer_file_source_type(file_name, mime_type)?;
    let source_id = learning_id("source");
    let metadata = json!({
        "originalName": file_name,
        "mimeType": mime_type,
        "sizeBytes": bytes.len(),
    });
    let stored_name = format!(
        "{}-{}",
        source_id,
        sanitize_file_name(metadata["originalName"].as_str().unwrap_or("attachment"))
    );
    let file_path = session_source_storage_dir(app, session_id)?.join(stored_name);
    fs::write(&file_path, &bytes).map_err(|error| error.to_string())?;

    let extracted_text = if source_type == "text" {
        String::from_utf8(bytes).ok()
    } else {
        None
    };

    conn.execute(
        "INSERT INTO learning_sources
         (id, session_id, type, title, raw_content, source_url, file_path, extracted_text, metadata_json, created_at)
         VALUES (?1, ?2, ?3, ?4, NULL, NULL, ?5, ?6, ?7, ?8)",
        params![
            source_id,
            session_id,
            source_type,
            metadata["originalName"].as_str().unwrap_or("Attachment"),
            file_path.to_string_lossy().to_string(),
            extracted_text,
            metadata.to_string(),
            now_iso(),
        ],
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

fn learning_id(prefix: &str) -> String {
    format!("{}-{}", prefix, Uuid::new_v4())
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn clean_text(value: Option<String>) -> Option<String> {
    value
        .map(|entry| entry.trim().to_string())
        .filter(|entry| !entry.is_empty())
}

fn normalize_source_type(value: &str) -> Result<String, String> {
    match value.trim().to_lowercase().as_str() {
        "text" | "note" | "url" | "pdf" | "audio" | "video" => {
            Ok(value.trim().to_lowercase())
        }
        _ => Err("Unsupported source type.".into()),
    }
}

fn infer_file_source_type(file_name: &str, mime_type: Option<&str>) -> Result<String, String> {
    let lower_name = file_name.to_lowercase();
    let mime = mime_type.unwrap_or_default().to_lowercase();
    if lower_name.ends_with(".pdf") || mime == "application/pdf" {
        return Ok("pdf".into());
    }
    if mime.starts_with("audio/") {
        return Ok("audio".into());
    }
    if mime.starts_with("video/") {
        return Ok("video".into());
    }
    if mime.starts_with("text/")
        || lower_name.ends_with(".txt")
        || lower_name.ends_with(".md")
        || lower_name.ends_with(".csv")
        || lower_name.ends_with(".json")
    {
        return Ok("text".into());
    }

    Err("Only PDF, audio, video, and text-based files are supported right now.".into())
}

fn sanitize_file_name(value: &str) -> String {
    value
        .chars()
        .map(|character| match character {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '.' | '-' | '_' => character,
            _ => '_',
        })
        .collect()
}

fn parse_json_array<T>(value: &str) -> Result<Vec<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    serde_json::from_str(value).map_err(|error| error.to_string())
}

fn parse_json_array_value<T>(value: &Value) -> Result<Vec<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    serde_json::from_value(value.clone()).map_err(|error| error.to_string())
}

fn required_string(value: &Value, field: &str) -> Result<String, String> {
    value[field]
        .as_str()
        .map(ToOwned::to_owned)
        .filter(|entry| !entry.trim().is_empty())
        .ok_or_else(|| format!("Missing '{}' in the AI response.", field))
}

fn normalize_answer(value: &str) -> String {
    value.trim().to_lowercase().replace('\n', " ")
}

fn csv_escape(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn compute_next_review_at(review_count: i64, correct: bool) -> String {
    let days = if correct {
        match review_count {
            0 => 1,
            1 => 3,
            2 => 7,
            _ => 14,
        }
    } else {
        1
    };
    (Utc::now() + Duration::days(days)).to_rfc3339()
}

fn source_version_hash(sources: &[LearningSource]) -> String {
    sources
        .iter()
        .map(|source| {
            format!(
                "{}:{}:{}",
                source.id,
                source.created_at,
                source
                    .extracted_text
                    .as_deref()
                    .or(source.raw_content.as_deref())
                    .map(str::len)
                    .unwrap_or(0)
            )
        })
        .collect::<Vec<_>>()
        .join("|")
}

fn build_source_context(sources: &[LearningSource]) -> Result<String, String> {
    let sections = sources
        .iter()
        .filter_map(|source| {
            let mut body = Vec::new();
            if let Some(url) = source.source_url.as_deref().filter(|value| !value.trim().is_empty()) {
                body.push(format!("URL: {}", url));
            }
            if let Some(text) = source
                .extracted_text
                .as_deref()
                .or(source.raw_content.as_deref())
                .map(str::trim)
                .filter(|value| !value.is_empty())
            {
                body.push(text.to_string());
            }

            if body.is_empty() {
                None
            } else {
                Some(format!(
                    "Source: {}\nType: {}\n{}",
                    source.title,
                    source.source_type,
                    body.join("\n")
                ))
            }
        })
        .collect::<Vec<_>>();

    if sections.is_empty() {
        return Err(
            "This session does not have readable text yet. Add pasted text, notes, URLs with notes, or a text file before using AI tools."
                .into(),
        );
    }

    Ok(sections.join("\n\n---\n\n"))
}

fn map_session_card_row(row: &Row<'_>) -> rusqlite::Result<LearningSessionCard> {
    Ok(LearningSessionCard {
        id: row.get("id")?,
        title: row.get("title")?,
        subject: row.get("subject")?,
        description: row.get("description")?,
        goals: row.get("goals")?,
        status: row.get("status")?,
        completion_percent: row.get("completion_percent")?,
        confidence_score: row.get("confidence_score")?,
        total_study_minutes: row.get("total_study_minutes")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        last_studied_at: row.get("last_studied_at")?,
        source_count: row.get("source_count")?,
        flashcard_count: row.get("flashcard_count")?,
        quiz_count: row.get("quiz_count")?,
        due_flashcards: row.get("due_flashcards")?,
        next_review_at: row.get("next_review_at")?,
    })
}

fn map_source_row(row: &Row<'_>) -> rusqlite::Result<LearningSource> {
    let metadata_json: String = row.get("metadata_json")?;
    Ok(LearningSource {
        id: row.get("id")?,
        session_id: row.get("session_id")?,
        source_type: row.get("type")?,
        title: row.get("title")?,
        raw_content: row.get("raw_content")?,
        source_url: row.get("source_url")?,
        file_path: row.get("file_path")?,
        extracted_text: row.get("extracted_text")?,
        metadata_json: serde_json::from_str(&metadata_json).unwrap_or_else(|_| json!({})),
        created_at: row.get("created_at")?,
    })
}

fn map_summary_row(row: &Row<'_>) -> rusqlite::Result<LearningSummary> {
    let key_concepts_json: String = row.get("key_concepts_json")?;
    let definitions_json: String = row.get("definitions_json")?;
    let action_points_json: String = row.get("action_points_json")?;
    Ok(LearningSummary {
        id: row.get("id")?,
        session_id: row.get("session_id")?,
        summary_short: row.get("summary_short")?,
        summary_detailed: row.get("summary_detailed")?,
        key_concepts: parse_json_array(&key_concepts_json).unwrap_or_default(),
        definitions: parse_json_array(&definitions_json).unwrap_or_default(),
        action_points: parse_json_array(&action_points_json).unwrap_or_default(),
        generated_at: row.get("generated_at")?,
        source_version_hash: row.get("source_version_hash")?,
    })
}

fn map_flashcard_row(row: &Row<'_>) -> rusqlite::Result<Flashcard> {
    let tags_json: String = row.get("tags_json")?;
    Ok(Flashcard {
        id: row.get("id")?,
        session_id: row.get("session_id")?,
        front: row.get("front")?,
        back: row.get("back")?,
        difficulty: row.get("difficulty")?,
        tags: parse_json_array(&tags_json).unwrap_or_default(),
        source_ref: row.get("source_ref")?,
        created_at: row.get("created_at")?,
        last_reviewed_at: row.get("last_reviewed_at")?,
        next_review_at: row.get("next_review_at")?,
        review_count: row.get("review_count")?,
        correct_count: row.get("correct_count")?,
    })
}

fn map_quiz_question_row(row: &Row<'_>) -> rusqlite::Result<QuizQuestion> {
    let options_json: String = row.get("options_json")?;
    Ok(QuizQuestion {
        id: row.get("id")?,
        quiz_id: row.get("quiz_id")?,
        question_type: row.get("type")?,
        prompt: row.get("prompt")?,
        options: parse_json_array(&options_json).unwrap_or_default(),
        answer: row.get("answer")?,
        explanation: row.get("explanation")?,
        difficulty: row.get("difficulty")?,
        order_index: row.get("order_index")?,
    })
}

fn map_review_row(row: &Row<'_>) -> rusqlite::Result<LearningReview> {
    Ok(LearningReview {
        id: row.get("id")?,
        session_id: row.get("session_id")?,
        review_type: row.get("review_type")?,
        duration_minutes: row.get("duration_minutes")?,
        confidence_before: row.get("confidence_before")?,
        confidence_after: row.get("confidence_after")?,
        notes: row.get("notes")?,
        created_at: row.get("created_at")?,
    })
}

fn map_message_row(row: &Row<'_>) -> rusqlite::Result<TutorMessage> {
    let citations_json: String = row.get("citations_json")?;
    Ok(TutorMessage {
        id: row.get("id")?,
        thread_id: row.get("thread_id")?,
        role: row.get("role")?,
        content: row.get("content")?,
        citations: parse_json_array(&citations_json).unwrap_or_default(),
        created_at: row.get("created_at")?,
    })
}

fn list_sessions(conn: &Connection) -> Result<Vec<LearningSessionCard>, String> {
    let now = now_iso();
    let mut statement = conn
        .prepare(
            "SELECT
                s.id,
                s.title,
                s.subject,
                s.description,
                s.goals,
                s.status,
                s.completion_percent,
                s.confidence_score,
                s.total_study_minutes,
                s.created_at,
                s.updated_at,
                s.last_studied_at,
                (SELECT COUNT(*) FROM learning_sources WHERE session_id = s.id) AS source_count,
                (SELECT COUNT(*) FROM learning_flashcards WHERE session_id = s.id) AS flashcard_count,
                (SELECT COUNT(*) FROM learning_quizzes WHERE session_id = s.id) AS quiz_count,
                (SELECT COUNT(*) FROM learning_flashcards WHERE session_id = s.id AND next_review_at IS NOT NULL AND next_review_at <= ?1) AS due_flashcards,
                (SELECT MIN(next_review_at) FROM learning_flashcards WHERE session_id = s.id AND next_review_at IS NOT NULL) AS next_review_at
             FROM learning_sessions s
             ORDER BY s.updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![now], map_session_card_row)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn fetch_session_card(conn: &Connection, session_id: &str) -> Result<LearningSessionCard, String> {
    let now = now_iso();
    conn.query_row(
        "SELECT
            s.id,
            s.title,
            s.subject,
            s.description,
            s.goals,
            s.status,
            s.completion_percent,
            s.confidence_score,
            s.total_study_minutes,
            s.created_at,
            s.updated_at,
            s.last_studied_at,
            (SELECT COUNT(*) FROM learning_sources WHERE session_id = s.id) AS source_count,
            (SELECT COUNT(*) FROM learning_flashcards WHERE session_id = s.id) AS flashcard_count,
            (SELECT COUNT(*) FROM learning_quizzes WHERE session_id = s.id) AS quiz_count,
            (SELECT COUNT(*) FROM learning_flashcards WHERE session_id = s.id AND next_review_at IS NOT NULL AND next_review_at <= ?1) AS due_flashcards,
            (SELECT MIN(next_review_at) FROM learning_flashcards WHERE session_id = s.id AND next_review_at IS NOT NULL) AS next_review_at
         FROM learning_sessions s
         WHERE s.id = ?2",
        params![now, session_id],
        map_session_card_row,
    )
    .map_err(|_| "Learning session not found.".to_string())
}

fn ensure_session_exists(conn: &Connection, session_id: &str) -> Result<(), String> {
    fetch_session_card(conn, session_id).map(|_| ())
}

fn list_sources(conn: &Connection, session_id: &str) -> Result<Vec<LearningSource>, String> {
    let mut statement = conn
        .prepare(
            "SELECT id, session_id, type, title, raw_content, source_url, file_path, extracted_text, metadata_json, created_at
             FROM learning_sources
             WHERE session_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![session_id], map_source_row)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn latest_summary(conn: &Connection, session_id: &str) -> Result<Option<LearningSummary>, String> {
    conn.query_row(
        "SELECT id, session_id, summary_short, summary_detailed, key_concepts_json, definitions_json, action_points_json, generated_at, source_version_hash
         FROM learning_summaries
         WHERE session_id = ?1
         ORDER BY generated_at DESC
         LIMIT 1",
        params![session_id],
        map_summary_row,
    )
    .optional()
    .map_err(|error| error.to_string())
}

fn list_flashcards(conn: &Connection, session_id: &str) -> Result<Vec<Flashcard>, String> {
    let mut statement = conn
        .prepare(
            "SELECT id, session_id, front, back, difficulty, tags_json, source_ref, created_at, last_reviewed_at, next_review_at, review_count, correct_count
             FROM learning_flashcards
             WHERE session_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![session_id], map_flashcard_row)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn fetch_quiz(conn: &Connection, quiz_id: &str) -> Result<Option<Quiz>, String> {
    let quiz_row: Option<(String, String, String, String, String, i64, Option<i64>, Option<String>)> =
        conn.query_row(
            "SELECT id, session_id, title, instructions, created_at, question_count, score_percent, completed_at
             FROM learning_quizzes
             WHERE id = ?1",
            params![quiz_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let Some((id, session_id, title, instructions, created_at, question_count, score_percent, completed_at)) =
        quiz_row
    else {
        return Ok(None);
    };

    let mut statement = conn
        .prepare(
            "SELECT id, quiz_id, type, prompt, options_json, answer, explanation, difficulty, order_index
             FROM learning_quiz_questions
             WHERE quiz_id = ?1
             ORDER BY order_index ASC",
        )
        .map_err(|error| error.to_string())?;
    let questions = statement
        .query_map(params![quiz_id], map_quiz_question_row)
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(Some(Quiz {
        id,
        session_id,
        title,
        instructions,
        created_at,
        question_count,
        score_percent,
        completed_at,
        questions,
    }))
}

fn list_quizzes(conn: &Connection, session_id: &str) -> Result<Vec<Quiz>, String> {
    let mut statement = conn
        .prepare(
            "SELECT id
             FROM learning_quizzes
             WHERE session_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let ids = statement
        .query_map(params![session_id], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let mut quizzes = Vec::new();
    for quiz_id in ids {
        if let Some(quiz) = fetch_quiz(conn, &quiz_id)? {
            quizzes.push(quiz);
        }
    }

    Ok(quizzes)
}

fn fetch_thread(conn: &Connection, thread_id: &str) -> Result<Option<TutorThread>, String> {
    let thread_row: Option<(String, String, String, String, String)> = conn
        .query_row(
            "SELECT id, session_id, title, created_at, updated_at
             FROM learning_tutor_threads
             WHERE id = ?1",
            params![thread_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let Some((id, session_id, title, created_at, updated_at)) = thread_row else {
        return Ok(None);
    };

    let mut statement = conn
        .prepare(
            "SELECT id, thread_id, role, content, citations_json, created_at
             FROM learning_tutor_messages
             WHERE thread_id = ?1
             ORDER BY created_at ASC",
        )
        .map_err(|error| error.to_string())?;
    let messages = statement
        .query_map(params![thread_id], map_message_row)
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(Some(TutorThread {
        id,
        session_id,
        title,
        created_at,
        updated_at,
        messages,
    }))
}

fn list_threads(conn: &Connection, session_id: &str) -> Result<Vec<TutorThread>, String> {
    let mut statement = conn
        .prepare(
            "SELECT id
             FROM learning_tutor_threads
             WHERE session_id = ?1
             ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let ids = statement
        .query_map(params![session_id], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let mut threads = Vec::new();
    for thread_id in ids {
        if let Some(thread) = fetch_thread(conn, &thread_id)? {
            threads.push(thread);
        }
    }

    Ok(threads)
}

fn list_reviews(conn: &Connection, session_id: &str) -> Result<Vec<LearningReview>, String> {
    let mut statement = conn
        .prepare(
            "SELECT id, session_id, review_type, duration_minutes, confidence_before, confidence_after, notes, created_at
             FROM learning_reviews
             WHERE session_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![session_id], map_review_row)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn fetch_session_detail(conn: &Connection, session_id: &str) -> Result<LearningSessionDetail, String> {
    let session = fetch_session_card(conn, session_id)?;
    let sources = list_sources(conn, session_id)?;
    let latest_summary = latest_summary(conn, session_id)?;
    let flashcards = list_flashcards(conn, session_id)?;
    let quizzes = list_quizzes(conn, session_id)?;
    let threads = list_threads(conn, session_id)?;
    let reviews = list_reviews(conn, session_id)?;
    let progress = build_progress_snapshot(conn, &session)?;
    let open_tutor_thread_id = threads.first().map(|thread| thread.id.clone());

    Ok(LearningSessionDetail {
        session,
        sources,
        latest_summary,
        flashcards,
        quizzes,
        threads,
        reviews,
        progress,
        open_tutor_thread_id,
    })
}

fn build_progress_snapshot(
    conn: &Connection,
    session: &LearningSessionCard,
) -> Result<LearningProgressSnapshot, String> {
    let average_quiz_score: Option<i64> = conn
        .query_row(
            "SELECT CAST(AVG(score_percent) AS INTEGER)
             FROM learning_quizzes
             WHERE session_id = ?1 AND score_percent IS NOT NULL",
            params![session.id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .flatten();
    let completed_quiz_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM learning_quizzes WHERE session_id = ?1 AND completed_at IS NOT NULL",
            params![session.id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let (total_reviews, total_correct): (Option<i64>, Option<i64>) = conn
        .query_row(
            "SELECT SUM(review_count), SUM(correct_count)
             FROM learning_flashcards
             WHERE session_id = ?1",
            params![session.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| error.to_string())?;
    let flashcard_accuracy = match (total_reviews.unwrap_or(0), total_correct.unwrap_or(0)) {
        (0, _) => None,
        (reviews, correct) => Some(((correct * 100) / reviews).clamp(0, 100)),
    };
    let review_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM learning_reviews WHERE session_id = ?1",
            params![session.id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let tutor_message_count: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM learning_tutor_messages messages
             JOIN learning_tutor_threads threads ON threads.id = messages.thread_id
             WHERE threads.session_id = ?1 AND messages.role = 'assistant'",
            params![session.id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let next_review_at: Option<String> = conn
        .query_row(
            "SELECT MIN(next_review_at)
             FROM learning_flashcards
             WHERE session_id = ?1 AND next_review_at IS NOT NULL",
            params![session.id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .flatten();

    let recommended_next_step = if session.source_count == 0 {
        "Add source material to start building this session.".to_string()
    } else if latest_summary(conn, &session.id)?.is_none() {
        "Generate a summary to turn your source material into study notes.".to_string()
    } else if session.flashcard_count == 0 {
        "Generate flashcards to move from reading into active recall.".to_string()
    } else if completed_quiz_count == 0 {
        "Generate and complete a quiz to test understanding.".to_string()
    } else if tutor_message_count == 0 {
        "Ask the tutor a question to reinforce weak spots.".to_string()
    } else {
        "Review due flashcards or continue the tutor thread.".to_string()
    };

    Ok(LearningProgressSnapshot {
        completion_percent: session.completion_percent,
        confidence_score: session.confidence_score,
        total_study_minutes: session.total_study_minutes,
        source_count: session.source_count,
        flashcard_count: session.flashcard_count,
        completed_quiz_count,
        average_quiz_score,
        flashcard_accuracy,
        review_count,
        tutor_message_count,
        next_review_at,
        last_studied_at: session.last_studied_at.clone(),
        recommended_next_step,
    })
}

fn touch_session(conn: &Connection, session_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE learning_sessions SET updated_at = ?2 WHERE id = ?1",
        params![session_id, now_iso()],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn log_review(
    conn: &Connection,
    session_id: &str,
    review_type: &str,
    duration_minutes: i64,
    notes: &str,
) -> Result<(), String> {
    let confidence_before: Option<i64> = conn
        .query_row(
            "SELECT confidence_score FROM learning_sessions WHERE id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    conn.execute(
        "INSERT INTO learning_reviews
         (id, session_id, review_type, duration_minutes, confidence_before, confidence_after, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7)",
        params![
            learning_id("review"),
            session_id,
            review_type,
            duration_minutes,
            confidence_before,
            notes,
            now_iso(),
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn recalculate_session_metrics(conn: &Connection, session_id: &str) -> Result<(), String> {
    let source_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM learning_sources WHERE session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let has_summary = latest_summary(conn, session_id)?.is_some();
    let flashcard_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM learning_flashcards WHERE session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let completed_quiz_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM learning_quizzes WHERE session_id = ?1 AND completed_at IS NOT NULL",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let review_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM learning_reviews WHERE session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let tutor_messages: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM learning_tutor_messages messages
             JOIN learning_tutor_threads threads ON threads.id = messages.thread_id
             WHERE threads.session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let completion_percent = [
        (source_count > 0) as i64,
        has_summary as i64,
        (flashcard_count > 0) as i64,
        (completed_quiz_count > 0) as i64,
        (review_count > 0 || tutor_messages > 0) as i64,
    ]
    .into_iter()
    .sum::<i64>()
        * 20;

    let flashcard_accuracy = conn
        .query_row(
            "SELECT CASE
                WHEN SUM(review_count) IS NULL OR SUM(review_count) = 0 THEN NULL
                ELSE CAST((SUM(correct_count) * 100) / SUM(review_count) AS INTEGER)
             END
             FROM learning_flashcards
             WHERE session_id = ?1",
            params![session_id],
            |row| row.get::<_, Option<i64>>(0),
        )
        .map_err(|error| error.to_string())?;
    let average_quiz_score = conn
        .query_row(
            "SELECT CAST(AVG(score_percent) AS INTEGER)
             FROM learning_quizzes
             WHERE session_id = ?1 AND score_percent IS NOT NULL",
            params![session_id],
            |row| row.get::<_, Option<i64>>(0),
        )
        .map_err(|error| error.to_string())?;
    let review_consistency = Some((review_count * 12).clamp(0, 100));
    let scores = [flashcard_accuracy, average_quiz_score, review_consistency]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    let confidence_score = if scores.is_empty() {
        0
    } else {
        (scores.iter().sum::<i64>() / scores.len() as i64).clamp(0, 100)
    };
    let total_study_minutes: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(duration_minutes), 0)
             FROM learning_reviews
             WHERE session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let last_studied_at: Option<String> = conn
        .query_row(
            "SELECT MAX(created_at) FROM learning_reviews WHERE session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .flatten();

    conn.execute(
        "UPDATE learning_sessions
         SET completion_percent = ?2,
             confidence_score = ?3,
             total_study_minutes = ?4,
             last_studied_at = ?5,
             updated_at = ?6
         WHERE id = ?1",
        params![
            session_id,
            completion_percent,
            confidence_score,
            total_study_minutes,
            last_studied_at,
            now_iso(),
        ],
    )
    .map_err(|error| error.to_string())?;

    conn.execute(
        "UPDATE learning_reviews
         SET confidence_after = ?2
         WHERE session_id = ?1 AND confidence_after IS NULL",
        params![session_id, confidence_score],
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

fn session_bundle_from_detail(detail: &LearningSessionDetail) -> Result<LearningSessionBundle, String> {
    let mut sources = Vec::new();
    for source in &detail.sources {
        let file_base64 = if let Some(path) = &source.file_path {
            let file = Path::new(path);
            if file.exists() {
                Some(base64::engine::general_purpose::STANDARD.encode(
                    fs::read(file).map_err(|error| error.to_string())?,
                ))
            } else {
                None
            }
        } else {
            None
        };

        sources.push(LearningSourceBundle {
            source: source.clone(),
            file_base64,
        });
    }

    Ok(LearningSessionBundle {
        version: 1,
        exported_at: now_iso(),
        session: detail.session.clone(),
        sources,
        latest_summary: detail.latest_summary.clone(),
        flashcards: detail.flashcards.clone(),
        quizzes: detail.quizzes.clone(),
        threads: detail.threads.clone(),
        reviews: detail.reviews.clone(),
    })
}

fn import_session_bundle_into_db(
    app: &AppHandle,
    conn: &Connection,
    bundle: LearningSessionBundle,
) -> Result<(), String> {
    let session_id = bundle.session.id.clone();
    conn.execute("DELETE FROM learning_sessions WHERE id = ?1", params![session_id.clone()])
        .map_err(|error| error.to_string())?;

    conn.execute(
        "INSERT INTO learning_sessions
         (id, title, subject, description, goals, status, completion_percent, confidence_score, total_study_minutes, created_at, updated_at, last_studied_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            bundle.session.id,
            bundle.session.title,
            bundle.session.subject,
            bundle.session.description,
            bundle.session.goals,
            bundle.session.status,
            bundle.session.completion_percent,
            bundle.session.confidence_score,
            bundle.session.total_study_minutes,
            bundle.session.created_at,
            bundle.session.updated_at,
            bundle.session.last_studied_at,
        ],
    )
    .map_err(|error| error.to_string())?;

    for source_bundle in bundle.sources {
        let mut source = source_bundle.source;
        if let Some(file_base64) = source_bundle.file_base64 {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(file_base64.as_bytes())
                .map_err(|_| "Could not decode an imported attachment.".to_string())?;
            let original_name = source
                .metadata_json
                .get("originalName")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned)
                .unwrap_or_else(|| format!("{}.bin", source.id));
            let file_path = session_source_storage_dir(app, &source.session_id)?
                .join(format!("{}-{}", source.id, sanitize_file_name(&original_name)));
            fs::write(&file_path, bytes).map_err(|error| error.to_string())?;
            source.file_path = Some(file_path.to_string_lossy().to_string());
        }

        conn.execute(
            "INSERT INTO learning_sources
             (id, session_id, type, title, raw_content, source_url, file_path, extracted_text, metadata_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                source.id,
                source.session_id,
                source.source_type,
                source.title,
                source.raw_content,
                source.source_url,
                source.file_path,
                source.extracted_text,
                source.metadata_json.to_string(),
                source.created_at,
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    if let Some(summary) = bundle.latest_summary {
        conn.execute(
            "INSERT INTO learning_summaries
             (id, session_id, summary_short, summary_detailed, key_concepts_json, definitions_json, action_points_json, generated_at, source_version_hash)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                summary.id,
                summary.session_id,
                summary.summary_short,
                summary.summary_detailed,
                serde_json::to_string(&summary.key_concepts).map_err(|error| error.to_string())?,
                serde_json::to_string(&summary.definitions).map_err(|error| error.to_string())?,
                serde_json::to_string(&summary.action_points).map_err(|error| error.to_string())?,
                summary.generated_at,
                summary.source_version_hash,
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    for flashcard in bundle.flashcards {
        conn.execute(
            "INSERT INTO learning_flashcards
             (id, session_id, front, back, difficulty, tags_json, source_ref, created_at, last_reviewed_at, next_review_at, review_count, correct_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                flashcard.id,
                flashcard.session_id,
                flashcard.front,
                flashcard.back,
                flashcard.difficulty,
                serde_json::to_string(&flashcard.tags).map_err(|error| error.to_string())?,
                flashcard.source_ref,
                flashcard.created_at,
                flashcard.last_reviewed_at,
                flashcard.next_review_at,
                flashcard.review_count,
                flashcard.correct_count,
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    for quiz in bundle.quizzes {
        conn.execute(
            "INSERT INTO learning_quizzes
             (id, session_id, title, instructions, created_at, question_count, score_percent, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                quiz.id,
                quiz.session_id,
                quiz.title,
                quiz.instructions,
                quiz.created_at,
                quiz.question_count,
                quiz.score_percent,
                quiz.completed_at,
            ],
        )
        .map_err(|error| error.to_string())?;

        for question in quiz.questions {
            conn.execute(
                "INSERT INTO learning_quiz_questions
                 (id, quiz_id, type, prompt, options_json, answer, explanation, difficulty, order_index)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    question.id,
                    question.quiz_id,
                    question.question_type,
                    question.prompt,
                    serde_json::to_string(&question.options).map_err(|error| error.to_string())?,
                    question.answer,
                    question.explanation,
                    question.difficulty,
                    question.order_index,
                ],
            )
            .map_err(|error| error.to_string())?;
        }
    }

    for thread in bundle.threads {
        conn.execute(
            "INSERT INTO learning_tutor_threads
             (id, session_id, title, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![thread.id, thread.session_id, thread.title, thread.created_at, thread.updated_at],
        )
        .map_err(|error| error.to_string())?;

        for message in thread.messages {
            conn.execute(
                "INSERT INTO learning_tutor_messages
                 (id, thread_id, role, content, citations_json, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    message.id,
                    message.thread_id,
                    message.role,
                    message.content,
                    serde_json::to_string(&message.citations).map_err(|error| error.to_string())?,
                    message.created_at,
                ],
            )
            .map_err(|error| error.to_string())?;
        }
    }

    for review in bundle.reviews {
        conn.execute(
            "INSERT INTO learning_reviews
             (id, session_id, review_type, duration_minutes, confidence_before, confidence_after, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                review.id,
                review.session_id,
                review.review_type,
                review.duration_minutes,
                review.confidence_before,
                review.confidence_after,
                review.notes,
                review.created_at,
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    recalculate_session_metrics(conn, &session_id)?;
    Ok(())
}

fn openai_headers() -> Result<HeaderMap, String> {
    let api_key = env::var("OPENAI_API_KEY")
        .or_else(|_| env::var("DAILYFORGE_OPENAI_API_KEY"))
        .map_err(|_| {
            "Missing OPENAI_API_KEY. Set it in the environment before using Learning AI."
                .to_string()
        })?;
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|error| error.to_string())?,
    );
    if let Ok(project) = env::var("OPENAI_PROJECT") {
        headers.insert(
            "OpenAI-Project",
            HeaderValue::from_str(&project).map_err(|error| error.to_string())?,
        );
    }
    Ok(headers)
}

fn openai_model() -> String {
    env::var("DAILYFORGE_OPENAI_MODEL").unwrap_or_else(|_| "gpt-5-mini".to_string())
}

async fn openai_json_completion(
    system_prompt: &str,
    user_prompt: &str,
    schema_name: &str,
    schema: Value,
) -> Result<Value, String> {
    let payload = json!({
        "model": openai_model(),
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": schema_name,
                "strict": true,
                "schema": schema
            }
        }
    });

    let raw = openai_completion_request(payload).await?;
    serde_json::from_str(&raw)
        .map_err(|_| "The AI returned malformed structured data.".to_string())
}

async fn openai_text_completion(system_prompt: &str, user_prompt: &str) -> Result<String, String> {
    let payload = json!({
        "model": openai_model(),
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ]
    });

    openai_completion_request(payload).await
}

async fn openai_completion_request(payload: Value) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(OPENAI_CHAT_COMPLETIONS_URL)
        .headers(openai_headers()?)
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("OpenAI request failed: {}", error))?;
    let status = response.status();
    let body = response.text().await.map_err(|error| error.to_string())?;

    if !status.is_success() {
        let api_message = serde_json::from_str::<Value>(&body)
            .ok()
            .and_then(|value| value["error"]["message"].as_str().map(ToOwned::to_owned))
            .unwrap_or(body);
        return Err(format!("OpenAI request failed: {}", api_message));
    }

    let value = serde_json::from_str::<Value>(&body).map_err(|error| error.to_string())?;
    value["choices"][0]["message"]["content"]
        .as_str()
        .map(ToOwned::to_owned)
        .or_else(|| {
            value["choices"][0]["message"]["content"]
                .as_array()
                .and_then(|items| {
                    items.iter().find_map(|item| {
                        item["text"]
                            .as_str()
                            .map(ToOwned::to_owned)
                            .or_else(|| item["content"].as_str().map(ToOwned::to_owned))
                    })
                })
        })
        .ok_or_else(|| "OpenAI response did not contain message content.".to_string())
}
