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

  return React.createElement(
    'div',
    { className: 'prompt-card' },
    React.createElement('h2', null, promptText),
    React.createElement(
      'form',
      { onSubmit: handleSubmit },
      React.createElement('textarea', {
        value: response,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setResponse(e.target.value),
        placeholder: 'Write your response here...'
      }),
      React.createElement('button', { type: 'submit' }, 'Submit')
    )
  );
};

export default PromptCard;