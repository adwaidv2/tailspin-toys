import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getCatalogSummary,
    getGamesByCategory,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('returns games filtered by category', async () => {
        const [strategy] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat' })
            .returning({ id: categories.id });
        const [puzzle] = await db
            .insert(categories)
            .values({ name: 'Puzzle', description: 'cat' })
            .returning({ id: categories.id });
        const [publisher] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'pub' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            {
                title: 'Strategy Game 1',
                description: 'Strategy 1',
                starRating: 4.5,
                categoryId: strategy.id,
                publisherId: publisher.id,
            },
            {
                title: 'Puzzle Game 1',
                description: 'Puzzle 1',
                starRating: 3.5,
                categoryId: puzzle.id,
                publisherId: publisher.id,
            },
            {
                title: 'Strategy Game 2',
                description: 'Strategy 2',
                starRating: 4.8,
                categoryId: strategy.id,
                publisherId: publisher.id,
            },
        ]);

        const filtered = await getGamesByCategory(db, strategy.id);
        expect(filtered.map((game) => game.title)).toEqual(['Strategy Game 1', 'Strategy Game 2']);
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('returns a total count and average rating for rated games', async () => {
        await seedGames(db, 3);
        const summary = await getCatalogSummary(db);

        expect(summary.totalGames).toBe(3);
        expect(summary.averageStarRating).toBe(4.2);
    });

    it('returns a null average when no games are rated', async () => {
        const [category] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat' })
            .returning({ id: categories.id });
        const [publisher] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'pub' })
            .returning({ id: publishers.id });

        await db.insert(games).values({
            title: 'Unrated Game',
            description: 'No rating',
            categoryId: category.id,
            publisherId: publisher.id,
        });

        expect(await getCatalogSummary(db)).toEqual({ totalGames: 1, averageStarRating: null });
    });

    it('returns zero total and null average when there are no games', async () => {
        expect(await getCatalogSummary(db)).toEqual({ totalGames: 0, averageStarRating: null });
    });
});
