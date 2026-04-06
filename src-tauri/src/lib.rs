mod learning;
mod learning_ai;
mod learning_local;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_dailyforge_tables",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_learning_lab_tables",
            sql: include_str!("../migrations/0002_learning_lab.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:dailyforge.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            learning::learning_list_sessions,
            learning::learning_create_session,
            learning::learning_create_session_from_file,
            learning::learning_get_session_detail,
            learning::learning_update_session,
            learning::learning_delete_session,
            learning::learning_add_source,
            learning::learning_attach_file,
            learning::learning_attach_file_from_path,
            learning::learning_delete_source,
            learning_local::learning_generate_summary,
            learning_local::learning_generate_flashcards,
            learning::learning_review_flashcard,
            learning_local::learning_generate_quiz,
            learning::learning_submit_quiz,
            learning::learning_create_tutor_thread,
            learning_local::learning_send_tutor_message,
            learning::learning_export_session_bundle,
            learning::learning_export_flashcards_csv,
            learning::learning_import_session_bundle,
            learning::learning_export_full_backup,
            learning::learning_import_full_backup,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}