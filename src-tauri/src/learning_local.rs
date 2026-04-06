use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::learning::{
    self, GenerateQuizInput, LearningConcept, LearningDefinition, LearningSessionDetail,
    LearningSource, SendTutorMessageInput,
};
use crate::learning_ai::{
    ensure_rag_indexed, json_schema_flashcards, json_schema_quiz, json_schema_summary,
    local_json_completion, local_text_completion,
};

const DB_FILENAME: &str = "dailyforge.db";

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

#[derive(Debug)]
struct SessionMeta {
    title: String,
    subject: String,
    goals: String,
}

#[tauri::command]
pub async fn learning_generate_summary(
    app: AppHandle,
    session_id: String,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    let session = fetch_session_meta(&conn, &session_id)?;
    let sources = list_sources(&conn, &session_id)?;
    let source_context = build_source_context(&sources)?;
    let version_hash = source_version_hash(&sources);
    ensure_rag_indexed(&session_id, &version_hash, &sources).await?;

    let user_prompt = format!(
        "Session title: {}\nSubject: {}\nGoals: {}\n\nStudy material:\n{}",
        session.title, session.subject, session.goals, source_context
    );

    let ai_output = local_json_completion(
        "You are an academic study assistant for a desktop learning workspace. Build concise, accurate study materials only from the provided session context.",
        &user_prompt,
        Some(&session_id),
        Some(&session.title),
        json_schema_summary(),
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
            session_id.clone(),
            required_string(&ai_output, "summaryShort")?,
            required_string(&ai_output, "summaryDetailed")?,
            serde_json::to_string(&key_concepts).map_err(|error| error.to_string())?,
            serde_json::to_string(&definitions).map_err(|error| error.to_string())?,
            serde_json::to_string(&action_points).map_err(|error| error.to_string())?,
            now_iso(),
            version_hash,
        ],
    )
    .map_err(|error| error.to_string())?;

    log_review(&conn, &session_id, "summary_review", 10, "Generated summary")?;
    touch_session(&conn, &session_id)?;
    recalculate_session_metrics(&conn, &session_id)?;
    learning::learning_get_session_detail(app, session_id)
}

#[tauri::command]
pub async fn learning_generate_flashcards(
    app: AppHandle,
    session_id: String,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    let session = fetch_session_meta(&conn, &session_id)?;
    let sources = list_sources(&conn, &session_id)?;
    let source_context = build_source_context(&sources)?;
    let version_hash = source_version_hash(&sources);
    ensure_rag_indexed(&session_id, &version_hash, &sources).await?;
    let latest_summary = latest_summary_detailed(&conn, &session_id)?;

    let user_prompt = format!(
        "Session title: {}\nSubject: {}\nSummary:\n{}\n\nStudy material:\n{}",
        session.title,
        session.subject,
        latest_summary.unwrap_or_default(),
        source_context
    );

    let ai_output = local_json_completion(
        "You create high-quality active-recall flashcards for a desktop study workspace. Use only the supplied material.",
        &user_prompt,
        Some(&session_id),
        Some(&session.title),
        json_schema_flashcards(),
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
                session_id.clone(),
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
    learning::learning_get_session_detail(app, session_id)
}

#[tauri::command]
pub async fn learning_generate_quiz(
    app: AppHandle,
    input: GenerateQuizInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    let session = fetch_session_meta(&conn, &input.session_id)?;
    let sources = list_sources(&conn, &input.session_id)?;
    let source_context = build_source_context(&sources)?;
    let version_hash = source_version_hash(&sources);
    ensure_rag_indexed(&input.session_id, &version_hash, &sources).await?;
    let latest_summary = latest_summary_detailed(&conn, &input.session_id)?;
    let question_count = input.question_count.unwrap_or(8).clamp(4, 12);
    let difficulty = input
        .difficulty
        .clone()
        .unwrap_or_else(|| "mixed".to_string())
        .to_lowercase();

    let user_prompt = format!(
        "Session title: {}\nSubject: {}\nDifficulty: {}\nQuestion count: {}\nSummary:\n{}\n\nStudy material:\n{}",
        session.title,
        session.subject,
        difficulty,
        question_count,
        latest_summary.unwrap_or_default(),
        source_context
    );

    let ai_output = local_json_completion(
        "You create rigorous study quizzes based only on the supplied learning session context. Avoid asking about information not present in the material.",
        &user_prompt,
        Some(&input.session_id),
        Some(&session.title),
        json_schema_quiz(question_count),
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
            input.session_id.clone(),
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
    learning::learning_get_session_detail(app, input.session_id)
}

#[tauri::command]
pub async fn learning_send_tutor_message(
    app: AppHandle,
    input: SendTutorMessageInput,
) -> Result<LearningSessionDetail, String> {
    let conn = open_connection(&app)?;
    let message = input.message.trim();
    if message.is_empty() {
        return Err("Tutor messages cannot be empty.".into());
    }

    let session = fetch_session_meta(&conn, &input.session_id)?;
    let sources = list_sources(&conn, &input.session_id)?;
    let version_hash = source_version_hash(&sources);
    ensure_rag_indexed(&input.session_id, &version_hash, &sources).await?;
    let summary = latest_summary_detailed(&conn, &input.session_id)?;
    let prior_messages = list_recent_thread_messages(&conn, &input.thread_id, 8)?;
    let flashcard_context = list_flashcard_pairs(&conn, &input.session_id, 8)?;

    conn.execute(
        "INSERT INTO learning_tutor_messages
         (id, thread_id, role, content, citations_json, created_at)
         VALUES (?1, ?2, 'user', ?3, '[]', ?4)",
        params![learning_id("message"), input.thread_id.clone(), message, now_iso()],
    )
    .map_err(|error| error.to_string())?;

    let user_prompt = format!(
        "Session title: {}\nSubject: {}\nGoals: {}\nSummary:\n{}\nRecent flashcards:\n{}\nRecent thread:\n{}\nStudy material:\n{}\n\nUser question:\n{}",
        session.title,
        session.subject,
        session.goals,
        summary.unwrap_or_default(),
        flashcard_context,
        prior_messages,
        build_source_context(&sources)?,
        message
    );

    let assistant_reply = local_text_completion(
        "You are an AI tutor for a desktop learning app. Answer only from the provided session context. If the context does not support the answer, say that clearly. Prefer concise, helpful explanations and revision prompts.",
        &user_prompt,
        Some(&input.session_id),
        Some(message),
    )
    .await?;

    let now = now_iso();
    conn.execute(
        "INSERT INTO learning_tutor_messages
         (id, thread_id, role, content, citations_json, created_at)
         VALUES (?1, ?2, 'assistant', ?3, '[]', ?4)",
        params![learning_id("message"), input.thread_id.clone(), assistant_reply.trim(), now],
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
    learning::learning_get_session_detail(app, input.session_id)
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

fn fetch_session_meta(conn: &Connection, session_id: &str) -> Result<SessionMeta, String> {
    conn.query_row(
        "SELECT title, subject, goals FROM learning_sessions WHERE id = ?1",
        params![session_id],
        |row| {
            Ok(SessionMeta {
                title: row.get(0)?,
                subject: row.get(1)?,
                goals: row.get(2)?,
            })
        },
    )
    .map_err(|_| "Learning session not found.".to_string())
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
        .query_map(params![session_id], |row| {
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
                metadata_json: serde_json::from_str(&metadata_json).unwrap_or_else(|_| serde_json::json!({})),
                created_at: row.get("created_at")?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

fn latest_summary_detailed(conn: &Connection, session_id: &str) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT summary_detailed FROM learning_summaries WHERE session_id = ?1 ORDER BY generated_at DESC LIMIT 1",
        params![session_id],
        |row| row.get(0),
    )
    .optional()
    .map_err(|error| error.to_string())
}

fn list_recent_thread_messages(conn: &Connection, thread_id: &str, max_items: i64) -> Result<String, String> {
    let mut statement = conn
        .prepare(
            "SELECT role, content FROM learning_tutor_messages WHERE thread_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![thread_id, max_items], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|error| error.to_string())?;
    let mut items = rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())?;
    items.reverse();
    Ok(items.into_iter().map(|(role, content)| format!("{}: {}", role, content)).collect::<Vec<_>>().join("\n"))
}

fn list_flashcard_pairs(conn: &Connection, session_id: &str, max_items: i64) -> Result<String, String> {
    let mut statement = conn
        .prepare(
            "SELECT front, back FROM learning_flashcards WHERE session_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![session_id, max_items], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|error| error.to_string())?;
    Ok(rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())?.into_iter().map(|(front, back)| format!("Q: {} | A: {}", front, back)).collect::<Vec<_>>().join("\n"))
}

fn now_iso() -> String { Utc::now().to_rfc3339() }
fn learning_id(prefix: &str) -> String { format!("{}-{}", prefix, Uuid::new_v4()) }

fn parse_json_array_value<T>(value: &Value) -> Result<Vec<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    serde_json::from_value(value.clone()).map_err(|error| error.to_string())
}

fn required_string(value: &Value, field: &str) -> Result<String, String> {
    value[field].as_str().map(ToOwned::to_owned).filter(|entry| !entry.trim().is_empty()).ok_or_else(|| format!("Missing '{}' in the AI response.", field))
}

fn build_source_context(sources: &[LearningSource]) -> Result<String, String> {
    let sections = sources.iter().filter_map(|source| {
        let mut body = Vec::new();
        if let Some(url) = source.source_url.as_deref().filter(|value| !value.trim().is_empty()) { body.push(format!("URL: {}", url)); }
        if let Some(text) = source.extracted_text.as_deref().or(source.raw_content.as_deref()).map(str::trim).filter(|value| !value.is_empty()) { body.push(text.to_string()); }
        if body.is_empty() { None } else { Some(format!("Source: {}\nType: {}\n{}", source.title, source.source_type, body.join("\n"))) }
    }).collect::<Vec<_>>();
    if sections.is_empty() { return Err("This session does not have readable text yet. Add pasted text, notes, URLs with notes, or a text file before using AI tools.".into()); }
    Ok(sections.join("\n\n---\n\n"))
}

fn source_version_hash(sources: &[LearningSource]) -> String {
    sources.iter().map(|source| format!("{}:{}:{}", source.id, source.created_at, source.extracted_text.as_deref().or(source.raw_content.as_deref()).map(str::len).unwrap_or(0))).collect::<Vec<_>>().join("|")
}

fn touch_session(conn: &Connection, session_id: &str) -> Result<(), String> {
    conn.execute("UPDATE learning_sessions SET updated_at = ?2 WHERE id = ?1", params![session_id, now_iso()]).map_err(|error| error.to_string())?; Ok(())
}

fn log_review(conn: &Connection, session_id: &str, review_type: &str, duration_minutes: i64, notes: &str) -> Result<(), String> {
    let confidence_before: Option<i64> = conn.query_row("SELECT confidence_score FROM learning_sessions WHERE id = ?1", params![session_id], |row| row.get(0)).optional().map_err(|error| error.to_string())?;
    conn.execute("INSERT INTO learning_reviews (id, session_id, review_type, duration_minutes, confidence_before, confidence_after, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7)", params![learning_id("review"), session_id, review_type, duration_minutes, confidence_before, notes, now_iso()]).map_err(|error| error.to_string())?; Ok(())
}

fn recalculate_session_metrics(conn: &Connection, session_id: &str) -> Result<(), String> {
    let source_count: i64 = conn.query_row("SELECT COUNT(*) FROM learning_sources WHERE session_id = ?1", params![session_id], |row| row.get(0)).map_err(|error| error.to_string())?;
    let has_summary: bool = conn.query_row("SELECT EXISTS(SELECT 1 FROM learning_summaries WHERE session_id = ?1)", params![session_id], |row| row.get(0)).map_err(|error| error.to_string())?;
    let flashcard_count: i64 = conn.query_row("SELECT COUNT(*) FROM learning_flashcards WHERE session_id = ?1", params![session_id], |row| row.get(0)).map_err(|error| error.to_string())?;
    let completed_quiz_count: i64 = conn.query_row("SELECT COUNT(*) FROM learning_quizzes WHERE session_id = ?1 AND completed_at IS NOT NULL", params![session_id], |row| row.get(0)).map_err(|error| error.to_string())?;
    let review_count: i64 = conn.query_row("SELECT COUNT(*) FROM learning_reviews WHERE session_id = ?1", params![session_id], |row| row.get(0)).map_err(|error| error.to_string())?;
    let tutor_messages: i64 = conn.query_row("SELECT COUNT(*) FROM learning_tutor_messages messages JOIN learning_tutor_threads threads ON threads.id = messages.thread_id WHERE threads.session_id = ?1", params![session_id], |row| row.get(0)).map_err(|error| error.to_string())?;
    let completion_percent = [(source_count > 0) as i64, has_summary as i64, (flashcard_count > 0) as i64, (completed_quiz_count > 0) as i64, (review_count > 0 || tutor_messages > 0) as i64].into_iter().sum::<i64>() * 20;
    let flashcard_accuracy = conn.query_row("SELECT CASE WHEN SUM(review_count) IS NULL OR SUM(review_count) = 0 THEN NULL ELSE CAST((SUM(correct_count) * 100) / SUM(review_count) AS INTEGER) END FROM learning_flashcards WHERE session_id = ?1", params![session_id], |row| row.get::<_, Option<i64>>(0)).map_err(|error| error.to_string())?;
    let average_quiz_score = conn.query_row("SELECT CAST(AVG(score_percent) AS INTEGER) FROM learning_quizzes WHERE session_id = ?1 AND score_percent IS NOT NULL", params![session_id], |row| row.get::<_, Option<i64>>(0)).map_err(|error| error.to_string())?;
    let review_consistency = Some((review_count * 12).clamp(0, 100));
    let scores = [flashcard_accuracy, average_quiz_score, review_consistency].into_iter().flatten().collect::<Vec<_>>();
    let confidence_score = if scores.is_empty() { 0 } else { (scores.iter().sum::<i64>() / scores.len() as i64).clamp(0, 100) };
    let total_study_minutes: i64 = conn.query_row("SELECT COALESCE(SUM(duration_minutes), 0) FROM learning_reviews WHERE session_id = ?1", params![session_id], |row| row.get(0)).map_err(|error| error.to_string())?;
    let last_studied_at: Option<String> = conn.query_row("SELECT MAX(created_at) FROM learning_reviews WHERE session_id = ?1", params![session_id], |row| row.get(0)).optional().map_err(|error| error.to_string())?.flatten();
    conn.execute("UPDATE learning_sessions SET completion_percent = ?2, confidence_score = ?3, total_study_minutes = ?4, last_studied_at = ?5, updated_at = ?6 WHERE id = ?1", params![session_id, completion_percent, confidence_score, total_study_minutes, last_studied_at, now_iso()]).map_err(|error| error.to_string())?;
    conn.execute("UPDATE learning_reviews SET confidence_after = ?2 WHERE session_id = ?1 AND confidence_after IS NULL", params![session_id, confidence_score]).map_err(|error| error.to_string())?;
    Ok(())
}
