export interface JournalEntry {
    date: string;
    content: string;
    mood: string;
}

export interface Prompt {
    text: string;
    onResponse: (response: string) => void;
}