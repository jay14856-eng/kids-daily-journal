export interface JournalEntry {
    date: string;
    content: string;
    saveEntry(): void;
    deleteEntry(): void;
}

export interface Prompt {
    text: string;
    onResponse(response: string): void;
}