import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/main.css';

const App = () => {
  return React.createElement(
    'div',
    { className: 'app' },
    React.createElement('h1', null, 'Kids Daily Journal'),
    React.createElement(
      'div',
      { className: 'prompt-card' },
      React.createElement('h2', null, 'What made you smile today?'),
      React.createElement('textarea', {
        placeholder: 'Write your response here...'
      }),
      React.createElement('button', { type: 'button' }, 'Submit')
    ),
    React.createElement(
      'div',
      { className: 'journal-entry' },
      React.createElement('h3', null, new Date().toLocaleDateString()),
      React.createElement('p', null, 'Today I felt...')
    )
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(React.createElement(App));
}