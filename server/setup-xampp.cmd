@echo off
REM Setup script to import MySQL schema into XAMPP's MySQL/MariaDB using available mysql.exe
SETLOCAL
SET SCHEMA_FILE=%~dp0schema-mysql.sql
nIF NOT EXIST "%SCHEMA_FILE%" (
  echo Schema file not found: %SCHEMA_FILE%
  exit /b 1
)

REM Allow overriding XAMPP path via XAMPP_HOME env var; fallback to common locations
IF DEFINED XAMPP_HOME (
  SET MYSQL_EXE=%XAMPP_HOME%\mysql\bin\mysql.exe
) ELSE (
  SET MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe
)

IF NOT EXIST "%MYSQL_EXE%" (
  echo mysql client not found at %MYSQL_EXE%
  echo Please ensure XAMPP is installed and set XAMPP_HOME to the XAMPP installation folder, or add mysql.exe to PATH.
  exit /b 1
)

necho Importing schema into MySQL database '%DB_NAME%' (user: %DB_USER%)
"%MYSQL_EXE%" -u %DB_USER% -p%DB_PASSWORD% < "%SCHEMA_FILE%"
IF %ERRORLEVEL% NEQ 0 (
  echo Failed to import schema. Check credentials and that MySQL server is running in XAMPP.
  exit /b 1
)
echo Schema imported successfully.
ENDLOCAL
