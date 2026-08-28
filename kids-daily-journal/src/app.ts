import { JournalEntry } from './components/JournalEntry';
import { PromptCard } from './components/PromptCard';

const app = document.getElementById('app');

if (app) {
    const journalEntry = new JournalEntry();
    const promptCard = new PromptCard({
        promptText: "What made you smile today?",
        onSubmit: (response) => {
            journalEntry.saveEntry(new Date().toLocaleDateString(), response, 'happy');
            alert('Your entry has been saved!');
        }
    });

    app.appendChild(promptCard.render());
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}