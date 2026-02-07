import { initDatabase, saveDatabase } from './database';
import fs from 'fs';
import path from 'path';

interface Account {
    account_id: string;
    name: string;
    industry: string;
    segment: string;
}

interface Rep {
    rep_id: string;
    name: string;
}

interface Deal {
    deal_id: string;
    account_id: string;
    rep_id: string;
    stage: string;
    amount: number | null;
    created_at: string;
    closed_at: string | null;
}

interface Activity {
    activity_id: string;
    deal_id: string;
    type: string;
    timestamp: string;
}

interface Target {
    month: string;
    target: number;
}

function loadJSON<T>(filename: string): T[] {
    const filePath = path.join(__dirname, '../../../data', filename);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

async function seed() {
    console.log('🌱 Starting database seeding...');

    const db = await initDatabase();

    // Clear existing data
    db.run('DELETE FROM activities');
    db.run('DELETE FROM deals');
    db.run('DELETE FROM targets');
    db.run('DELETE FROM reps');
    db.run('DELETE FROM accounts');

    // Load and insert accounts
    const accounts = loadJSON<Account>('accounts.json');
    const insertAccount = db.prepare(
        'INSERT INTO accounts (account_id, name, industry, segment) VALUES (?, ?, ?, ?)'
    );
    for (const account of accounts) {
        insertAccount.run([account.account_id, account.name, account.industry, account.segment]);
    }
    insertAccount.free();
    console.log(`✅ Inserted ${accounts.length} accounts`);

    // Load and insert reps
    const reps = loadJSON<Rep>('reps.json');
    const insertRep = db.prepare('INSERT INTO reps (rep_id, name) VALUES (?, ?)');
    for (const rep of reps) {
        insertRep.run([rep.rep_id, rep.name]);
    }
    insertRep.free();
    console.log(`✅ Inserted ${reps.length} reps`);

    // Load and insert deals
    const deals = loadJSON<Deal>('deals.json');
    const insertDeal = db.prepare(
        'INSERT INTO deals (deal_id, account_id, rep_id, stage, amount, created_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const deal of deals) {
        insertDeal.run([
            deal.deal_id,
            deal.account_id,
            deal.rep_id,
            deal.stage,
            deal.amount,
            deal.created_at,
            deal.closed_at
        ]);
    }
    insertDeal.free();
    console.log(`✅ Inserted ${deals.length} deals`);

    // Load and insert activities
    const activities = loadJSON<Activity>('activities.json');
    const insertActivity = db.prepare(
        'INSERT INTO activities (activity_id, deal_id, type, timestamp) VALUES (?, ?, ?, ?)'
    );
    for (const activity of activities) {
        insertActivity.run([activity.activity_id, activity.deal_id, activity.type, activity.timestamp]);
    }
    insertActivity.free();
    console.log(`✅ Inserted ${activities.length} activities`);

    // Load and insert targets
    const targets = loadJSON<Target>('targets.json');
    const insertTarget = db.prepare('INSERT INTO targets (month, target) VALUES (?, ?)');
    for (const target of targets) {
        insertTarget.run([target.month, target.target]);
    }
    insertTarget.free();
    console.log(`✅ Inserted ${targets.length} targets`);

    // Save database to file
    saveDatabase();
    console.log('💾 Database saved to disk');

    console.log('🎉 Database seeding completed!');
}

seed().catch(console.error);
