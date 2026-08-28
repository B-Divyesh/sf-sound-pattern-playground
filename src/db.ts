import type { SoundSample } from './models';

const DB_NAME = 'sound-pattern-playground';
const DB_VERSION = 1;
const SAMPLES = 'samples';
const SETTINGS = 'settings';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve());
    transaction.addEventListener('abort', () => reject(transaction.error));
    transaction.addEventListener('error', () => reject(transaction.error));
  });
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SAMPLES)) database.createObjectStore(SAMPLES, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(SETTINGS)) database.createObjectStore(SETTINGS, { keyPath: 'key' });
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });
  return databasePromise;
}

export async function getSamples(): Promise<SoundSample[]> {
  const database = await openDatabase();
  return requestResult(database.transaction(SAMPLES).objectStore(SAMPLES).getAll());
}

export async function saveSample(sample: SoundSample): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SAMPLES, 'readwrite');
  transaction.objectStore(SAMPLES).put(sample);
  await transactionDone(transaction);
}

export async function saveSamples(samples: SoundSample[]): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SAMPLES, 'readwrite');
  for (const sample of samples) transaction.objectStore(SAMPLES).put(sample);
  await transactionDone(transaction);
}

export async function removeSample(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SAMPLES, 'readwrite');
  transaction.objectStore(SAMPLES).delete(id);
  await transactionDone(transaction);
}

export async function clearSamples(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SAMPLES, 'readwrite');
  transaction.objectStore(SAMPLES).clear();
  await transactionDone(transaction);
}

export async function getLabels(): Promise<string[] | null> {
  const database = await openDatabase();
  const record = await requestResult<{ key: string; value: string[] } | undefined>(
    database.transaction(SETTINGS).objectStore(SETTINGS).get('labels'),
  );
  return record?.value ?? null;
}

export async function saveLabels(labels: string[]): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SETTINGS, 'readwrite');
  transaction.objectStore(SETTINGS).put({ key: 'labels', value: labels });
  await transactionDone(transaction);
}

export async function clearSettings(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SETTINGS, 'readwrite');
  transaction.objectStore(SETTINGS).clear();
  await transactionDone(transaction);
}
