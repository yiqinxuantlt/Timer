use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SessionRecord {
    id: String,
    subject: String,
    #[serde(rename = "startedAt")]
    started_at: i64,
    #[serde(rename = "endedAt")]
    ended_at: i64,
    #[serde(rename = "duration_seconds")]
    duration_seconds: u64,
    #[serde(rename = "targetDuration")]
    target_duration: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct StudyData {
    records: Vec<SessionRecord>,
    total_seconds: u64,
}

fn get_data_path(app: &tauri::AppHandle) -> PathBuf {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join("study_data.json")
}

fn load_data(app: &tauri::AppHandle) -> StudyData {
    let path = get_data_path(app);
    if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        StudyData::default()
    }
}

fn save_data(app: &tauri::AppHandle, data: &StudyData) {
    let path = get_data_path(app);
    let json = serde_json::to_string_pretty(data).unwrap_or_default();
    fs::write(path, json).ok();
}

#[tauri::command]
fn get_study_data(app: tauri::AppHandle) -> StudyData {
    load_data(&app)
}

#[tauri::command]
fn save_study_session(
    app: tauri::AppHandle,
    duration_seconds: u64,
    subject: String,
) -> StudyData {
    let mut data = load_data(&app);
    let now = chrono::Local::now().timestamp_millis();

    data.records.push(SessionRecord {
        id: uuid::Uuid::new_v4().to_string(),
        subject,
        started_at: now - (duration_seconds * 1000) as i64,
        ended_at: now,
        duration_seconds,
        target_duration: 3600000, // default 1 hour
    });

    data.total_seconds += duration_seconds;
    save_data(&app, &data);
    data
}

#[tauri::command]
fn save_study_data(app: tauri::AppHandle, data: StudyData) -> StudyData {
    save_data(&app, &data);
    data
}

#[tauri::command]
fn clear_study_data(app: tauri::AppHandle) -> StudyData {
    let data = StudyData::default();
    save_data(&app, &data);
    data
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_study_data,
            save_study_session,
            save_study_data,
            clear_study_data,
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
