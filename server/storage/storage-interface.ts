export interface IStorageAdapter {
  init(): Promise<void>;
  find<T>(collection: string, filter?: (item: T) => boolean): Promise<T[]>;
  findById<T extends { id: string }>(collection: string, id: string): Promise<T | null>;
  create<T extends { id: string }>(collection: string, item: T): Promise<T>;
  update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<T | null>;
  delete<T extends { id: string }>(collection: string, id: string): Promise<boolean>;
  count<T>(collection: string, filter?: (item: T) => boolean): Promise<number>;
  transaction<R>(fn: () => Promise<R>): Promise<R>;
  getNextSequence(key: string, startFrom?: number): Promise<number>;
  createBackup(label?: string): Promise<{ backupId: string; filePath: string; timestamp: string }>;
  restoreBackup(backupId: string): Promise<{ success: boolean; message: string }>;
  listBackups(): Promise<Array<{ id: string; filename: string; timestamp: string; size: number }>>;
  verifyIntegrity(): Promise<{ valid: boolean; collections: Record<string, { count: number; valid: boolean; error?: string }> }>;
}
