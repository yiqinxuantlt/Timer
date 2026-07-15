use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
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
    #[serde(default = "default_session_status")]
    status: String,
}

fn default_session_status() -> String {
    "completed".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct StudyData {
    records: Vec<SessionRecord>,
    total_seconds: u64,
}

/// Error type returned by all Tauri commands
#[derive(Debug, Serialize)]
struct CommandError {
    message: String,
}

impl From<std::io::Error> for CommandError {
    fn from(err: std::io::Error) -> Self {
        CommandError {
            message: err.to_string(),
        }
    }
}

impl From<serde_json::Error> for CommandError {
    fn from(err: serde_json::Error) -> Self {
        CommandError {
            message: err.to_string(),
        }
    }
}

fn get_data_path(app: &tauri::AppHandle) -> Result<PathBuf, CommandError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError {
            message: format!("failed to get app data dir: {e}"),
        })?;
    fs::create_dir_all(&data_dir)?;
    Ok(data_dir.join("study_data.json"))
}

fn load_data(app: &tauri::AppHandle) -> Result<StudyData, CommandError> {
    let path = get_data_path(app)?;
    if path.exists() {
        let content = fs::read_to_string(&path)?;
        let data: StudyData = serde_json::from_str(&content)?;
        Ok(data)
    } else {
        Ok(StudyData::default())
    }
}

/// Atomic write: write to temp file then rename, prevents data corruption on crash
fn save_data_atomic(app: &tauri::AppHandle, data: &StudyData) -> Result<(), CommandError> {
    let path = get_data_path(app)?;
    let json = serde_json::to_string_pretty(data)?;

    // Write to temp file in same directory (same filesystem → atomic rename)
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, &json)?;
    replace_file(&temp_path, &path)?;
    Ok(())
}

#[cfg(windows)]
fn replace_file(temp_path: &Path, path: &Path) -> Result<(), CommandError> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    let temp_path: Vec<u16> = temp_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let path: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let result = unsafe {
        MoveFileExW(
            temp_path.as_ptr(),
            path.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };

    if result == 0 {
        return Err(CommandError {
            message: std::io::Error::last_os_error().to_string(),
        });
    }

    Ok(())
}

#[cfg(not(windows))]
fn replace_file(temp_path: &Path, path: &Path) -> Result<(), CommandError> {
    fs::rename(temp_path, path)?;
    Ok(())
}

#[tauri::command]
fn get_study_data(app: tauri::AppHandle) -> Result<StudyData, CommandError> {
    load_data(&app)
}

#[tauri::command]
fn save_study_data(app: tauri::AppHandle, data: StudyData) -> Result<StudyData, CommandError> {
    save_data_atomic(&app, &data)?;
    Ok(data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_study_data,
            save_study_data,
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
