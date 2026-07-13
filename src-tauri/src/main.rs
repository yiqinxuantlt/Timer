// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct StudyRecord {
    date: String,
    duration_seconds: u64,
    subject: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct StudyData {
    records: Vec<StudyRecord>,
    total_seconds: u64,
}

fn get_data_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .expect("failed to get app data dir");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join("study_data.json")
}

fn load_data(app_handle: &tauri::AppHandle) -> StudyData {
    let path = get_data_path(app_handle);
    if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        StudyData::default()
    }
}

fn save_data(app_handle: &tauri::AppHandle, data: &StudyData) {
    let path = get_data_path(app_handle);
    let json = serde_json::to_string_pretty(data).unwrap_or_default();
    fs::write(path, json).ok();
}

#[tauri::command]
fn get_study_data(app_handle: tauri::AppHandle) -> StudyData {
    load_data(&app_handle)
}

#[tauri::command]
fn save_study_session(app_handle: tauri::AppHandle, duration_seconds: u64, subject: String) -> StudyData {
    let mut data = load_data(&app_handle);
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    
    // Check if today's record exists
    if let Some(existing) = data.records.iter_mut().find(|r| r.date == today && r.subject == subject) {
        existing.duration_seconds += duration_seconds;
    } else {
        data.records.push(StudyRecord {
            date: today,
            duration_seconds,
            subject,
        });
    }
    
    data.total_seconds += duration_seconds;
    save_data(&app_handle, &data);
    data
}

#[tauri::command]
fn clear_study_data(app_handle: tauri::AppHandle) -> StudyData {
    let data = StudyData::default();
    save_data(&app_handle, &data);
    data
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_study_data,
            save_study_session,
            clear_study_data,
        ])
        .setup(|app| {
            // Load data on startup
            let _ = load_data(&app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
