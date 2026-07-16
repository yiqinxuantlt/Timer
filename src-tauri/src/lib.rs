use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Manager, State};
use uuid::Uuid;

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
    #[serde(default = "default_session_mode")]
    mode: String,
}

fn default_session_status() -> String {
    "completed".to_string()
}

fn default_session_mode() -> String {
    "focus".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct StudyData {
    records: Vec<SessionRecord>,
    total_seconds: u64,
}

#[derive(Default)]
struct StudyDataLock {
    inner: Mutex<()>,
}

/// Error type returned by all Tauri commands.
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

fn command_error(message: impl Into<String>) -> CommandError {
    CommandError {
        message: message.into(),
    }
}

fn get_data_path(app: &tauri::AppHandle) -> Result<PathBuf, CommandError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| command_error(format!("failed to get app data dir: {error}")))?;
    fs::create_dir_all(&data_dir)?;
    Ok(data_dir.join("study_data.json"))
}

fn get_backup_path(path: &Path) -> PathBuf {
    path.with_file_name("study_data.backup.json")
}

fn read_study_data(path: &Path) -> Result<StudyData, CommandError> {
    let content = fs::read_to_string(path)
        .map_err(|error| command_error(format!("failed to read {}: {error}", path.display())))?;
    serde_json::from_str(&content)
        .map_err(|error| command_error(format!("invalid JSON in {}: {error}", path.display())))
}

fn unique_temp_path(path: &Path) -> Result<PathBuf, CommandError> {
    let parent = path
        .parent()
        .ok_or_else(|| command_error("study data path has no parent directory"))?;
    let name = path
        .file_name()
        .ok_or_else(|| command_error("study data path has no filename"))?
        .to_string_lossy();

    Ok(parent.join(format!(".{name}.{}.tmp", Uuid::new_v4())))
}

/// Atomically replace a file after syncing a unique temporary file on the same filesystem.
fn write_atomic_text(path: &Path, content: &str) -> Result<(), CommandError> {
    let temp_path = unique_temp_path(path)?;
    let result = (|| {
        let mut temp_file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)?;
        temp_file.write_all(content.as_bytes())?;
        temp_file.sync_all()?;
        drop(temp_file);
        replace_file(&temp_path, path)
    })();

    if result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }

    result
}

/// Preserve the last known-good document without replacing a valid backup with corrupt input.
fn backup_existing_data(path: &Path) -> Result<(), CommandError> {
    if !path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(path)?;
    if serde_json::from_str::<StudyData>(&content).is_err() {
        return Ok(());
    }

    write_atomic_text(&get_backup_path(path), &content)
}

fn restore_backup(backup_path: &Path, data_path: &Path) -> Result<(), CommandError> {
    let content = fs::read_to_string(backup_path)?;
    write_atomic_text(data_path, &content)
}

fn load_data(app: &tauri::AppHandle) -> Result<StudyData, CommandError> {
    let data_path = get_data_path(app)?;
    let backup_path = get_backup_path(&data_path);

    if data_path.exists() {
        match read_study_data(&data_path) {
            Ok(data) => return Ok(data),
            Err(primary_error) => {
                if backup_path.exists() {
                    match read_study_data(&backup_path) {
                        Ok(data) => {
                            if let Err(restore_error) = restore_backup(&backup_path, &data_path) {
                                eprintln!(
                                    "Recovered study data from backup but could not restore the primary file: {}",
                                    restore_error.message
                                );
                            }
                            return Ok(data);
                        }
                        Err(backup_error) => {
                            return Err(command_error(format!(
                                "study data and its backup are unreadable; primary: {}; backup: {}",
                                primary_error.message, backup_error.message
                            )));
                        }
                    }
                }

                return Err(command_error(format!(
                    "study data is unreadable and no backup is available: {}",
                    primary_error.message
                )));
            }
        }
    }

    if backup_path.exists() {
        let data = read_study_data(&backup_path)?;
        if let Err(restore_error) = restore_backup(&backup_path, &data_path) {
            eprintln!(
                "Loaded study data from backup but could not restore the primary file: {}",
                restore_error.message
            );
        }
        return Ok(data);
    }

    Ok(StudyData::default())
}

fn save_data_atomic(app: &tauri::AppHandle, data: &StudyData) -> Result<(), CommandError> {
    let data_path = get_data_path(app)?;
    let json = serde_json::to_string_pretty(data)?;

    backup_existing_data(&data_path)?;
    write_atomic_text(&data_path, &json)
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
        return Err(command_error(std::io::Error::last_os_error().to_string()));
    }

    Ok(())
}

#[cfg(not(windows))]
fn replace_file(temp_path: &Path, path: &Path) -> Result<(), CommandError> {
    fs::rename(temp_path, path)?;
    Ok(())
}

#[tauri::command]
fn get_study_data(
    app: tauri::AppHandle,
    state: State<'_, StudyDataLock>,
) -> Result<StudyData, CommandError> {
    let _guard = state
        .inner
        .lock()
        .map_err(|_| command_error("study data lock is poisoned"))?;
    load_data(&app)
}

#[tauri::command]
fn save_study_data(
    app: tauri::AppHandle,
    state: State<'_, StudyDataLock>,
    data: StudyData,
) -> Result<StudyData, CommandError> {
    let _guard = state
        .inner
        .lock()
        .map_err(|_| command_error("study data lock is poisoned"))?;
    save_data_atomic(&app, &data)?;
    Ok(data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(StudyDataLock::default())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![get_study_data, save_study_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
