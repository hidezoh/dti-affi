import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(__dirname, '../data.db');

// Initialize DB
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    site_id TEXT,
    site_name TEXT,
    title TEXT,
    actress TEXT,
    description TEXT,
    release_date TEXT,
    sample_url TEXT,
    aff_link TEXT,
    original_id TEXT,
    sample_movie_url_2 TEXT,
    provider_name TEXT
  );
`);

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO videos (
    id, site_id, site_name, title, actress, description, release_date, 
    sample_url, aff_link, original_id, sample_movie_url_2, provider_name
  ) VALUES (
    @movie_id, @site_id, @site_name, @title, @actress, @description, @release_date,
    @sample_url, @aff_link, @original_id, @sample_movie_url_2, @provider_name
  )
`);

async function ingest() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv'));
  
  console.log(`Found ${files.length} CSV files.`);

  let totalInserted = 0;

  db.transaction(() => {
    for (const file of files) {
      console.log(`Processing ${file}...`);
      const content = fs.readFileSync(path.join(DATA_DIR, file));
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true
      });

      for (const record of records) {
        try {
            // Basic validation/cleaning
            if (!record.movie_id) continue;
            
            insertStmt.run(record);
            totalInserted++;
        } catch (err) {
            console.error(`Error inserting record in ${file}:`, err.message);
        }
      }
    }
  })();

  console.log(`Ingestion complete. Inserted ${totalInserted} records.`);
}

ingest();
