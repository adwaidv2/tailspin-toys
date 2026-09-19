import { eq, asc, count, sql } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export interface CatalogSummary {
    totalGames: number;
    averageStarRating: number | null;
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** All game categories ordered by name. */
export async function getAllCategories(db: Database): Promise<{ id: number; name: string }[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}

/** All games ordered by title. */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** Filtered games for a single category ordered by title. */
export async function getGamesByCategory(db: Database, categoryId: number): Promise<Game[]> {
    const rows = await baseGamesQuery(db)
        .where(eq(games.categoryId, categoryId))
        .orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

/** Catalog totals and average star rating, with graceful empty/unrated fallbacks. */
export async function getCatalogSummary(db: Database): Promise<CatalogSummary> {
    const totalRows = await db.select({ totalGames: count() }).from(games).get();
    const totalGames = Number(totalRows?.totalGames ?? 0);

    const ratedRows = await db
        .select({ averageStarRating: sql<number | null>`avg(${games.starRating})` })
        .from(games)
        .where(sql`${games.starRating} IS NOT NULL`)
        .get();

    const averageStarRating = ratedRows?.averageStarRating ?? null;

    if (totalGames === 0 || averageStarRating === null) {
        return { totalGames, averageStarRating: null };
    }

    return {
        totalGames,
        averageStarRating: Number(averageStarRating),
    };
}
