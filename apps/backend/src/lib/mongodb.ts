import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

function getClientPromise(): Promise<MongoClient> {
    if (clientPromise) return clientPromise;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('Please add your MONGODB_URI environment variable to your .env file.');
    }

    if (process.env.NODE_ENV === 'development') {
        let globalWithMongo = global as typeof globalThis & {
            _mongoClientPromise?: Promise<MongoClient>;
        };

        if (!globalWithMongo._mongoClientPromise) {
            client = new MongoClient(uri);
            globalWithMongo._mongoClientPromise = client.connect();
        }
        clientPromise = globalWithMongo._mongoClientPromise;
    } else {
        client = new MongoClient(uri);
        clientPromise = client.connect();
    }
    return clientPromise;
}

export default {
    then(onfulfilled?: any, onrejected?: any) {
        return getClientPromise().then(onfulfilled, onrejected);
    }
} as unknown as Promise<MongoClient>;

export async function getDb(dbName = 'Laundry'): Promise<Db> {
    const cp = await getClientPromise();
    return cp.db(dbName);
}
