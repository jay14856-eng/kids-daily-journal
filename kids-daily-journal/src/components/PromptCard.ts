import React from 'react';

interface PromptCardProps {
    promptText: string;
    onResponse: (response: string) => void;
}

const PromptCard: React.FC<PromptCardProps> = ({ promptText, onResponse }) => {
    const [response, setResponse] = React.useState('');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        onResponse(response);
        setResponse('');
    };

    return (
        <div className="prompt-card">
            <h2>{promptText}</h2>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write your response here..."
                    required
                />
                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

export default PromptCard;