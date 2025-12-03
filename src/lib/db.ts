import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.db');

let db: Database.Database;

try {
    db = new Database(DB_PATH, {
        verbose: console.log,
        readonly: true,
        fileMustExist: true
    });
} catch (error) {
    console.error('Failed to open database:', error);
    throw error;
}

export interface Video {
    id: string;
    site_id: string;
    site_name: string;
    title: string;
    actress: string;
    description: string;
    release_date: string;
    sample_url: string;
    aff_link: string;
    original_id: string;
    sample_movie_url_2: string;
    provider_name: string;
}

export function getLatestVideos(limit = 20): Video[] {
    const stmt = db.prepare('SELECT * FROM videos ORDER BY release_date DESC LIMIT ?');
    return stmt.all(limit) as Video[];
}

export function getVideoById(id: string): Video | undefined {
    const stmt = db.prepare('SELECT * FROM videos WHERE id = ?');
    return stmt.get(id) as Video | undefined;
}

export function searchVideos(query: string, limit = 20): Video[] {
    const stmt = db.prepare(`
    SELECT * FROM videos 
    WHERE title LIKE ? OR actress LIKE ? 
    ORDER BY release_date DESC 
    LIMIT ?
  `);
    const searchPattern = `%${query}%`;
    return stmt.all(searchPattern, searchPattern, limit) as Video[];
}
