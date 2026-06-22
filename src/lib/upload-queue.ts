/**
 * Fila de uploads persistida em IndexedDB. Suporta Blobs grandes (diferente do
 * localStorage). Usada como rede de segurança quando o PUT direto no S3 ou o
 * fallback via edge function falham — o item fica na fila e é reenviado
 * automaticamente quando o StepFotos remonta ou quando a rede volta.
 */

export type QueuedUpload = {
  id: string;
  photoTypeId: number;
  blob: Blob;
  mimeType: string;
  productId: string;
  entryId: string;
  accountId: string;
  attempts: number;
  createdAt: number;
};

const DB_NAME = "wr-upload-queue";
const STORE = "uploads";
const DB_VERSION = 1;

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("entryId", "entryId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  if (!isBrowser()) return undefined as unknown as T;
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result: T;
    Promise.resolve(fn(store))
      .then((r) => {
        if (r && typeof (r as IDBRequest).onsuccess !== "undefined") {
          (r as IDBRequest).onsuccess = () => {
            result = (r as IDBRequest).result as T;
          };
          (r as IDBRequest).onerror = () => reject((r as IDBRequest).error);
        } else {
          result = r as T;
        }
      })
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueue(
  item: Omit<QueuedUpload, "id" | "attempts" | "createdAt">,
): Promise<string> {
  if (!isBrowser()) return "";
  const id = uuid();
  const full: QueuedUpload = {
    ...item,
    id,
    attempts: 0,
    createdAt: Date.now(),
  };
  await tx("readwrite", (s) => s.put(full));
  return id;
}

export async function dequeue(id: string): Promise<void> {
  if (!isBrowser()) return;
  await tx("readwrite", (s) => s.delete(id));
}

export async function getAll(): Promise<QueuedUpload[]> {
  if (!isBrowser()) return [];
  return await tx("readonly", (s) => s.getAll() as IDBRequest<QueuedUpload[]>);
}

export async function getByEntry(entryId: string): Promise<QueuedUpload[]> {
  const all = await getAll();
  return all.filter((i) => i.entryId === entryId);
}

export async function incrementAttempts(id: string): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const store = t.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const cur = getReq.result as QueuedUpload | undefined;
      if (!cur) {
        resolve();
        return;
      }
      cur.attempts = (cur.attempts ?? 0) + 1;
      store.put(cur);
    };
    getReq.onerror = () => reject(getReq.error);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function clearByEntry(entryId: string): Promise<void> {
  const items = await getByEntry(entryId);
  for (const i of items) await dequeue(i.id);
}
