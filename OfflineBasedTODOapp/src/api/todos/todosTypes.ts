export interface Todos {
    id: string;
    title: string;
    content: string | null;
    status: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export enum TodosStatus {
    PENDING = 'pending',
    COMPLETED = 'completed'
}
